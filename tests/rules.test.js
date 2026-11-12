import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {analyzeClauses,evaluateProperty,evaluateFinance} from '../src/rules.js';
test('additional lien allowed detects',()=>assert.ok(analyzeClauses('임대인은 임대차 기간 중 근저당권을 설정할 수 있으며 임차인은 이의를 제기하지 않는다.').some(r=>r.id==='additional-lien')));
test('protective clause not flagged',()=>assert.equal(analyzeClauses('임대인은 임대차 기간 중 근저당권을 설정하지 않는다.').length,0));
test('security deposit waiver detects',()=>assert.ok(analyzeClauses('임차인은 보증금 반환 청구를 포기한다.').some(r=>r.id==='waive-claim')));
test('no claims given means cannot calculate combined',()=>assert.equal(evaluateProperty({deposit:'20000',marketValue:'25000',seniorClaims:NaN}).combinedRatio,null));
test('normal ratios',()=>assert.equal(evaluateProperty({deposit:20000,marketValue:25000,seniorClaims:4000}).combinedRatio,96));
test('emergency months',()=>assert.equal(evaluateFinance({emergencyFunds:1200,monthlyEssentialSpending:400}).emergencyMonths,3));
