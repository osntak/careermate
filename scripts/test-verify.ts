/**
 * Unit tests for the deterministic verify engine (@careermate/core/verify).
 * Run: node --import tsx scripts/test-verify.ts   (no DB, no flags needed)
 * Includes the adversarial fixtures from the Codex review + the
 * fabricate-a-record-then-cite-it bypass de-silencing.
 */
import {
  extractNumbers,
  analyzeProvenance,
  lintArtifact,
  styleSignals,
  type VerifyCorpus,
} from '../packages/core/src/verify/index.ts';

let pass = 0,
  fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

console.log('\n1) 숫자 토큰화 (조사·콤마·단위·풀와이드·연도)');
{
  const val = (s: string) => extractNumbers(s).map((n) => `${n.value}${n.unit}|risk:${n.risk}`).join(', ');
  ok('8만 건 → 80000', extractNumbers('약 8만 건을 정제')[0]?.value === 80000, val('약 8만 건을 정제'));
  ok('1.2억 → 1.2e8', extractNumbers('유지매출 1.2억 방어')[0]?.value === 1.2e8, val('1.2억'));
  ok('250% 단위 %', extractNumbers('전환율 250% 상승')[0]?.unit === '%', val('250%'));
  ok('조사 결합 12건을 → 12', extractNumbers('12건을 줄였다')[0]?.value === 12, val('12건을'));
  ok('풀와이드 １２건 → 12', extractNumbers('１２건 처리')[0]?.value === 12, val('１２건 처리'));
  ok('연도 2024는 제외', extractNumbers('2024년 입사').every((n) => n.value !== 2024), val('2024년 입사'));
  ok('7년은 클레임으로 유지', extractNumbers('경력 7년').some((n) => n.value === 7 && n.risk), val('경력 7년'));
}

// documents = the user's actual résumé text; structured = AI-writable records.
const corpus: VerifyCorpus = {
  documents: '이력서 본문: 마케팅 캠페인으로 매출 30% 성장. 고객 1,200명 관리.',
  structured: '경력: 야간 인계 누락 민원을 분기 12건에서 3건으로 줄임. 프로젝트: 공공데이터 약 8만 건 정제. 경력 7년.',
  job: '데이터 사이언스 5년 이상. 통계 석사 우대.',
};

console.log('\n2) 출처(provenance) — 문서/구조화/공고 3-스코프');
{
  ok('문서 수치(30%)는 supported', analyzeProvenance('매출을 30% 키웠습니다', corpus).supported === 1);
  ok('파생: 9건 = 12−3 (구조화) → fabricated 아님', analyzeProvenance('9건을 줄였습니다', corpus).fabricated.length === 0);
  const struct = analyzeProvenance('인계를 12건에서 3건으로 줄였습니다', corpus);
  ok('구조화 전용 수치(12,3)는 unverified(차단 아님)', struct.fabricated.length === 0 && struct.unverified.length >= 1, JSON.stringify(struct));
  ok('허위: 250% → fabricated', analyzeProvenance('전환율 250% 상승', corpus).fabricated.length === 1);
  const scope = analyzeProvenance('데이터 분석 5년 경험이 있습니다', corpus);
  ok('스코프: 공고의 5년이 본인 5년을 지지하지 않음(job_only)', scope.fabricated.length === 0 && scope.jobSourced.length === 1, JSON.stringify(scope));
}

console.log('\n3) 게이트 — 허위수치 차단 / 구조화 전용은 advisory로 저장 허용');
{
  const bad = lintArtifact('cover_letter', '매출을 250% 끌어올렸고 고객 만족도 98점을 달성했습니다.', corpus);
  ok('허위수치(250%, 98점) → 차단', bad.blocking.length === 1 && bad.provenance.fabricated.length === 2, JSON.stringify(bad.provenance.fabricated));
  const struct = lintArtifact('cover_letter', '인계 누락 민원을 12건에서 3건으로 줄였습니다.', corpus);
  ok('구조화 전용 수치 → 차단 안 함(저장 허용) + unverified 표기', struct.blocking.length === 0 && struct.provenance.unverified.length >= 1, JSON.stringify(struct.provenance));
  const noCorpus = lintArtifact('cover_letter', '매출 250% 상승', { documents: '', structured: '', job: '' });
  ok('코퍼스 없으면 차단 안 함(검증 불가)', noCorpus.blocking.length === 0 && noCorpus.corpusAvailable === false);
}

console.log('\n5) 엄격 모드 — 구조화 전용 수치도 차단');
{
  const text = '인계 누락 민원을 12건에서 3건으로 줄였습니다.'; // 구조화에만 있는 수치
  ok('기본 모드: 구조화 전용 → 차단 안 함', lintArtifact('cover_letter', text, corpus).blocking.length === 0);
  const strict = lintArtifact('cover_letter', text, corpus, { strict: true });
  ok('엄격 모드: 구조화 전용 → 차단', strict.blocking.length === 1 && strict.strict === true, JSON.stringify(strict.blocking));
  ok('엄격 모드: 문서 수치(30%)는 통과', lintArtifact('cover_letter', '매출을 30% 키웠습니다', corpus, { strict: true }).blocking.length === 0);
  ok('엄격 모드: 허위수치는 여전히 차단', lintArtifact('cover_letter', '매출 250% 성장', corpus, { strict: true }).blocking.length === 1);
}

console.log('\n4) 문체 신호 (advisory)');
{
  const sig = styleSignals('저는 항상 데이터의 힘을 믿어왔습니다. 책임감이 강하며 데이터 분석을 통해 귀사에 기여하고 싶습니다.');
  const ids = sig.map((s) => s.id);
  ok('제너릭 도입 감지', ids.includes('generic_opener'), ids.join(','));
  ok('빈 형용사 감지', ids.includes('empty_adjective'), ids.join(','));
  ok('번역투(통해) 감지', ids.includes('translationese'), ids.join(','));
  ok('클리셰(귀사) 감지', ids.includes('cliche'), ids.join(','));
  ok('문체 신호는 차단 아님', lintArtifact('cover_letter', '저는 항상 데이터의 힘을 믿어왔습니다. 귀사에 기여하고 싶습니다.', corpus).blocking.length === 0);
}

console.log(`\nVERIFY_VERDICT ${fail === 0 ? 'PASS' : 'FAIL'}  (pass=${pass} fail=${fail})`);
process.exit(fail === 0 ? 0 : 1);
