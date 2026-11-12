import {analyzeClauses,evaluateProperty,evaluateFinance} from './src/rules.js';
const $=id=>document.getElementById(id);
const fmt=v=>Number.isFinite(v)?new Intl.NumberFormat('ko-KR',{maximumFractionDigits:1}).format(v):'확인 불가';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let fileName='';
const isFilled=id=>$(id).value.trim()!=='';
const numberOrNaN=id=>isFilled(id)?Number($(id).value):NaN;
const setStatus=t=>$('file-status').textContent=t;
const example=`[가상 전세계약서 · 교육용 예시]\n목적물: 서울특별시 ○○구 가상로 12, 201호\n전세보증금: 금 이억원정 (200,000,000원)\n임대차 기간: 2026년 12월 1일부터 2028년 11월 30일까지\n특약사항\n1. 임대인은 임대차 기간 중 근저당권을 설정할 수 있으며 임차인은 이에 이의를 제기하지 않는다.\n2. 보증금 반환은 다음 임차인이 들어오면 진행한다.\n3. 임차인은 보증금 반환 청구를 포기한다.\n4. 임대인은 입주 당시부터 존재하던 하자에 대하여 필요한 수선을 한다.\n※ 본 문서는 위험 탐지 시연을 위한 허구의 자료입니다.`;
$('sample').addEventListener('click',()=>{$('contract-text').value=example;$('deposit').value='20000';$('marketValue').value='25000';$('seniorClaims').value='4000';setStatus('가상 예시 계약서를 불러왔습니다.');});
const dz=$('dropzone');dz.onclick=()=> $('file').click();dz.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('file').click();}};
for(const name of ['dragover','dragenter']) dz.addEventListener(name,e=>{e.preventDefault();dz.classList.add('drag');});
for(const name of ['dragleave','drop']) dz.addEventListener(name,e=>{e.preventDefault();dz.classList.remove('drag');});
dz.addEventListener('drop',e=>processFile(e.dataTransfer.files[0]));$('file').addEventListener('change',e=>processFile(e.target.files[0]));
async function processFile(file){
  if(!file)return;
  if(file.size>15*1024*1024){setStatus('15MB 이하 파일만 처리합니다.');return;}
  const pdf=file.type==='application/pdf'||/\.pdf$/i.test(file.name);
  const image=file.type.startsWith('image/');
  if(!pdf&&!image){setStatus('지원되지 않는 파일 형식입니다.');return;}
  fileName=file.name;setStatus(`${file.name} 읽는 중…`);
  try{
    let text='';
    if(pdf){
      const pdfjs=await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
      const doc=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      if(doc.numPages>20)throw Error('20쪽 이하 PDF만 지원합니다.');
      for(let p=1;p<=doc.numPages;p++){
        const page=await doc.getPage(p);const content=await page.getTextContent();
        text+=`\n[${p}쪽]\n`+content.items.map(x=>x.str).join(' ');
      }
      if(text.replace(/\[\d+쪽\]/g,'').trim().length<30)throw Error('텍스트가 거의 없는 스캔 PDF입니다. 현재는 텍스트 PDF를 권장하며, 스캔 PDF는 페이지를 이미지로 저장하여 올려주세요.');
    }else{
      // OCR engine and language data are fetched from external CDNs; document pixels are processed locally.
      if(!window.Tesseract){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
      const worker=await window.Tesseract.createWorker('kor+eng');
      try{const result=await worker.recognize(file);text=result.data.text;}finally{await worker.terminate();}
    }
    $('contract-text').value=text;setStatus(`${file.name} 읽기 완료 · 추출 문구를 꼭 검토하세요.`);
  }catch(err){setStatus(`문서 읽기 실패: ${err?.message||'네트워크 또는 파일 형식을 확인하세요.'} 직접 입력은 가능합니다.`);}
}
for(const tab of document.querySelectorAll('.tab'))tab.addEventListener('click',()=>{for(const t of document.querySelectorAll('.tab'))t.classList.toggle('active',t===tab);$('housing').classList.toggle('hidden',tab.dataset.tab!=='housing');$('finance').classList.toggle('hidden',tab.dataset.tab!=='finance');});
$('reset').onclick=()=>{if(!confirm('입력한 계약서와 금액을 모두 초기화할까요?'))return;$('contract-text').value='';for(const el of document.querySelectorAll('input[type="number"]'))el.value='';$('file').value='';$('housingType').value='';$('results').classList.add('hidden');setStatus('입력을 초기화했습니다.');};
$('print').onclick=()=>window.print();
function addMetric(label,value){return `<div class="metric"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;}
function info(inner){return `<div class="info">${inner}</div>`;}
$('run').onclick=()=>{
  const text=$('contract-text').value.trim();
  if(text.length<10){setStatus('계약서 내용을 10자 이상 입력하거나 예시를 불러오세요.');$('contract-text').focus();return;}
  const findings=analyzeClauses(text);
  const property=evaluateProperty({deposit:numberOrNaN('deposit'),marketValue:numberOrNaN('marketValue'),seniorClaims:numberOrNaN('seniorClaims')});
  const finance=evaluateFinance(Object.fromEntries(['deposit','ownFunds','loan','monthlyIncome','monthlyRepayment','emergencyFunds','monthlyEssentialSpending'].map(id=>[id,numberOrNaN(id)])));
  $('summary').innerHTML=`<div class="stat"><span>주의·검토 조항</span><strong>${findings.length}건</strong><span>설정한 규칙 내 발견 수</span></div><div class="stat"><span>전세가율</span><strong>${property.ltv===null?'—':fmt(property.ltv)+'%'}</strong><span>입력한 시세 기준</span></div><div class="stat"><span>추가 확인사항</span><strong>5건</strong><span>계약서 외부 정보 포함</span></div>`;
  $('clauses').innerHTML=findings.length?findings.map(f=>`<div class="finding"><div class="finding-title"><span class="pill ${f.level==='검토'?'review':''}">${escapeHTML(f.level)}</span>${escapeHTML(f.label)}</div><div class="quote">“${escapeHTML(f.quote)}”</div><p>${escapeHTML(f.reason)}</p><p><b>다음 행동:</b> ${escapeHTML(f.action)}</p><small>법률 검토 출발점: ${escapeHTML(f.source)} · 법률적 효력 자동 판정 아님</small></div>`).join(''):info('<b>설정된 규칙에서 주의 문구를 찾지 못했습니다.</b><p>안전하다는 의미는 아닙니다. 모든 조항과 계약 외부 정보를 확인해야 합니다.</p>');
  const ht=$('housingType').value;
  let prop=addMetric('주택 유형',ht||'미입력');
  prop+=addMetric('전세가율',property.ltv===null?'계산 불가':fmt(property.ltv)+'%');
  prop+=addMetric('선순위 채권 + 보증금 ÷ 주택 시세',property.combinedRatio===null?'계산 불가':fmt(property.combinedRatio)+'%');
  prop+='<p>이 비율은 시세 대비 입력된 채권 규모를 단순 비교한 참고 지표이며 경매 배당 순위나 보증금 회수액을 계산하지 않습니다.</p>';
  if(ht==='다가구주택')prop+='<p><b>다가구주택 주의:</b> 다른 임차인의 선순위 보증금은 등기부등본에 개별적으로 표시되지 않습니다. 별도 확인이 중요합니다.</p>';
  if(property.combinedRatio!==null&&property.combinedRatio>=100)prop+='<p><b>주의:</b> 입력된 선순위 채권과 내 보증금 합계가 주택 시세 이상입니다. 입력값의 정확성과 추가 권리관계 등을 우선 확인하세요.</p>';
  $('property').innerHTML=info(prop);
  let fin=addMetric('전세대출 비중',finance.loanShare===null?'입력 부족':fmt(finance.loanShare)+'%');
  fin+=addMetric('월 상환 부담률',finance.repaymentRatio===null?'입력 부족':fmt(finance.repaymentRatio)+'%');
  fin+=addMetric('비상자금 유지기간',finance.emergencyMonths===null?'입력 부족':fmt(finance.emergencyMonths)+'개월');
  if(finance.fundingDifference!==null&&Math.abs(finance.fundingDifference)>0.001)fin+=`<p>자기자금 + 전세대출과 보증금 사이에 ${fmt(Math.abs(finance.fundingDifference))}만 원 차이가 있습니다. 다른 자금원이 있는지 확인하세요.</p>`;
  fin+='<p>이 지표는 생활비·대출 부담에 대한 참고 계산이며 전세사기 발생 가능성과 직접 연결되지 않습니다.</p>';
  $('finance-report').innerHTML=info(fin);
  const checks=[
    '등기사항증명서를 계약 직전과 잔금 지급 전 다시 확인하기',
    '다가구주택 등에서 다른 임차인의 선순위 보증금과 확정일자 현황 확인하기',
    '임대인·공인중개사에게 세금 체납과 선순위 권리정보에 대한 증빙 요청하기',
    '전세보증금 반환보증 가입 가능 여부를 HUG 등 보증기관에 직접 확인하기',
    '건물 시세, 실제 거래 가격, 계약 특약 및 대항력·확정일자 요건 점검하기'
  ];
  $('checklist').innerHTML=checks.map((v,i)=>`<div class="check"><span>0${i+1}</span><div>${escapeHTML(v)}</div></div>`).join('');
  $('results').classList.remove('hidden');$('results').scrollIntoView({behavior:'smooth'});
};
