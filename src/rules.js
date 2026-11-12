/** Conservative advisory-only clause detection. Not a legal opinion. */
export const rules = [
  {id:'additional-lien',label:'임대인의 추가 담보권 설정 허용',level:'주의',pattern:/(임대인|집주인).{0,65}(근저당|담보권|담보대출).{0,55}(설정할 수 있|허용|동의|이의.{0,8}(없|제기하지))/,
   ignore:/(설정하지 않|설정을 금지|설정할 수 없|설정하지 못|동의 없이 설정할 수 없)/,
   reason:'임대인이 임대차 중 추가 담보권을 설정하도록 허용하는 특약은 보증금 회수에 영향을 줄 수 있습니다. 실제 권리 순위는 설정 시점과 권리관계에 따라 달라집니다.',action:'추가 담보권 설정 금지 특약 검토, 등기사항증명서 확인 및 공인중개사·전문가 상담',source:'주택임대차보호법 제3조·제3조의2'},
  {id:'waive-claim',label:'보증금 반환 요구 제한',level:'주의',pattern:/(임차인|세입자).{0,85}(보증금|반환).{0,40}(청구하지 않|포기|이의.{0,8}(없|제기하지)|반환.{0,12}요구하지 않)/,
   ignore:/(포기하지 않|청구권을 보장|요구하지 않을 수 없)/,
   reason:'보증금 반환을 요구할 권리를 제한하거나 포기시키는 문구는 임차인에게 불리할 수 있으며 효력 검토가 필요합니다.',action:'해당 조항의 삭제·수정 요구, 주택임대차보호법 제10조 등 법률 전문가 확인',source:'주택임대차보호법 제10조'},
  {id:'deposit-delay',label:'보증금 반환 지연 가능 조항',level:'검토',pattern:/(보증금|임차보증금).{0,55}(다음 임차인|신규 임차인|새 세입자|새로운 세입자).{0,45}(들어오|구해|계약|입주)|(?:다음 임차인|신규 임차인|새 세입자).{0,55}(보증금|반환)/,
   ignore:/(무관하게 반환|관계없이 반환|입주 여부와 상관없이)/,
   reason:'보증금 반환 시점을 신규 임차인 확보와 연계하면 실제 반환 지연 위험이 있을 수 있습니다. 문장 전체의 의미와 법적 효력을 별도로 검토해야 합니다.',action:'계약 종료 시 반환 의무의 시점을 명확히 할 것',source:'민법 제618조 및 임대차계약 법리'},
  {id:'repair-cost',label:'수리비 전부를 임차인에게 전가',level:'검토',pattern:/(수리|보수|하자|시설물).{0,55}(모든|일체|전액).{0,22}(임차인|세입자).{0,25}(부담|책임)|(?:임차인|세입자).{0,38}(모든|일체|전액).{0,30}(수리|보수|하자)/,
   ignore:/(고의|과실|파손으로 인해)/,
   reason:'임대인의 유지·수선 의무와 관계없이 모든 수리비를 임차인에게 전가하는 것은 불리할 수 있습니다. 구체적 하자와 수선 범위에 따라 판단이 달라집니다.',action:'임대인의 수선 의무와 임차인 과실에 따른 비용을 구분해 기재',source:'민법 제623조'},
  {id:'early-end',label:'임대인 일방의 중도해지 권한',level:'검토',pattern:/(임대인|집주인).{0,55}(언제든지|임의로|일방적으로).{0,35}(해지|종료)|(?:임대인|집주인).{0,55}(해지|종료).{0,25}(언제든지|임의로|일방적으로)/,
   ignore:/(법률에서 정한|법정 사유)/,
   reason:'임대인에게만 폭넓은 일방적 해지권을 부여하는 문구는 불리할 수 있습니다.',action:'해지 사유·통지 기간·정산 절차를 구체적으로 확인',source:'주택임대차보호법 및 민법 임대차 규정'},
  {id:'tax-shift',label:'임대인 세금의 임차인 전가',level:'검토',pattern:/(재산세|종합부동산세|임대인.{0,8}세금).{0,40}(임차인|세입자).{0,28}(부담|납부)|(?:임차인|세입자).{0,40}(재산세|종합부동산세)/,
   ignore:/(부담하지 않|납부하지 않)/,
   reason:'임대인의 조세 부담을 임차인에게 전가하는 합의는 부담 범위와 효력을 별도로 검토해야 합니다.',action:'세금의 종류와 부담 주체를 명확히 확인',source:'개별 조세법령 및 민법 계약 법리'}
];
const normalize = text => String(text??'').replace(/\s+/g,' ').trim();
export function analyzeClauses(text){
  const chunks = String(text??'').split(/\n|[。]|(?<=\.)\s+/).map(normalize).filter(Boolean);
  const matches=[];
  for(const chunk of chunks){
    for(const rule of rules){
      if(rule.pattern.test(chunk) && !rule.ignore.test(chunk)) matches.push({id:rule.id,label:rule.label,level:rule.level,quote:chunk.slice(0,500),reason:rule.reason,action:rule.action,source:rule.source});
    }
  }
  return matches;
}
export function evaluateProperty({deposit,marketValue,seniorClaims}){
  const d=Number(deposit),m=Number(marketValue),s=Number(seniorClaims);
  return {
    ltv: Number.isFinite(d)&&Number.isFinite(m)&&m>0 ? d/m*100:null,
    combinedRatio: Number.isFinite(d)&&Number.isFinite(m)&&Number.isFinite(s)&&m>0&&s>=0 ? (d+s)/m*100:null
  };
}
export function evaluateFinance({deposit,ownFunds,loan,monthlyIncome,monthlyRepayment,emergencyFunds,monthlyEssentialSpending}){
  const d=Number(deposit),o=Number(ownFunds),l=Number(loan),i=Number(monthlyIncome),r=Number(monthlyRepayment),e=Number(emergencyFunds),sp=Number(monthlyEssentialSpending);
  return {
    loanShare:Number.isFinite(d)&&d>0&&Number.isFinite(l)&&l>=0?l/d*100:null,
    repaymentRatio:Number.isFinite(i)&&i>0&&Number.isFinite(r)&&r>=0?r/i*100:null,
    emergencyMonths:Number.isFinite(e)&&e>=0&&Number.isFinite(sp)&&sp>0?e/sp:null,
    fundingDifference:Number.isFinite(d)&&Number.isFinite(o)&&Number.isFinite(l)&&d>0?d-o-l:null
  };
}
