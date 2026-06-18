/**
 * `shots-seed` — richer demo data for marketing screenshots ONLY.
 *
 * Unlike `scripts/seed.ts` (one job, for a first-run feel), this fills the whole
 * pipeline: jobs across every status, a few cover letters, fit analyses, and an
 * interview prep — so the home dashboard, the applications board and the jobs
 * list all look populated in the landing-page screenshots.
 *
 * NEVER run this against real data. Always isolate into a throwaway dir:
 *   CAREERMATE_DATA_DIR=./.shots-data npm run shots:seed
 */
import {
  profileRepo, experienceRepo, projectRepo, skillRepo, getDataDir,
} from '@careermate/db';
import {
  saveProfile, saveJobPosting, saveFitAnalysis, saveCoverLetterVersion,
  updateApplicationStatus, saveInterviewPrep, addResume,
} from '@careermate/core';

if (profileRepo.get()?.name) {
  console.error('⚠️  데이터가 이미 있습니다. 마케팅 시드는 빈 throwaway 폴더에서만 실행하세요.');
  console.error('   예:  CAREERMATE_DATA_DIR=./.shots-data npm run shots:seed');
  process.exit(1);
}

saveProfile({
  name: '홍길동',
  email: 'gildong.hong@example.com',
  phone: '010-1234-5678',
  location: '서울',
  headline: '5년 차 백엔드 엔지니어 · 결제/정산 도메인',
  summary: '대규모 트래픽 환경에서 결제·정산 시스템을 설계·운영했습니다. 안정성과 데이터 정합성을 중시하며, 문제를 정량적으로 정의하고 개선하는 것을 좋아합니다.',
  desired_roles: ['백엔드 엔지니어', '서버 개발자', '플랫폼 엔지니어'],
  desired_conditions: '서울/판교, 정규직, 원격 일부 가능, 결제/금융 도메인 선호',
  preferred_tone: '담백하고 구체적이며, 성과를 숫자로 보여주는 문체',
  emphasis_points: ['대규모 트래픽 처리 경험', '데이터 정합성', '장애 대응', '동료와의 협업'],
  links: [
    { label: 'GitHub', url: 'https://github.com/example' },
    { label: '기술 블로그', url: 'https://blog.example.com' },
  ],
});

experienceRepo.add({
  company: '페이테크', role: '백엔드 엔지니어', employment_type: '정규직',
  start_date: '2021-03', is_current: true,
  description: '결제 게이트웨이와 정산 시스템 개발·운영',
  achievements: ['결제 승인 API p99 응답시간 320ms→110ms 개선', '정산 배치 처리 시간 6시간→40분 단축', '장애 0건으로 연간 거래액 1.2조 처리'],
  tech: ['Java', 'Spring Boot', 'Kafka', 'MySQL', 'Redis', 'Kubernetes'],
});
experienceRepo.add({
  company: '커머스랩', role: '주니어 백엔드 개발자', employment_type: '정규직',
  start_date: '2019-01', end_date: '2021-02',
  description: '커머스 주문/재고 서비스 개발',
  achievements: ['주문 동시성 이슈 해결로 재고 오차 99% 감소', '검색 응답속도 2배 개선'],
  tech: ['Python', 'Django', 'PostgreSQL', 'Elasticsearch'],
});

projectRepo.add({
  name: '실시간 정산 파이프라인', role: '설계 및 리드',
  description: 'Kafka 기반 이벤트 스트리밍으로 준실시간 정산 파이프라인 구축',
  highlights: ['정산 지연 6시간→실시간', '재처리 가능한 멱등 설계'],
  tech: ['Kafka', 'Spring', 'MySQL'], url: 'https://github.com/example/settlement',
});
projectRepo.add({
  name: '결제 장애 자동 복구 시스템', role: '개발',
  description: 'PG사 장애 시 자동 우회 라우팅 및 알림',
  highlights: ['장애 평균 복구시간 15분→2분'], tech: ['Java', 'Spring', 'Redis'],
});

for (const s of [
  { name: 'Java', category: '언어', level: '상', years: 5 },
  { name: 'Spring Boot', category: '프레임워크', level: '상', years: 5 },
  { name: 'Kafka', category: '인프라', level: '중', years: 3 },
  { name: 'MySQL', category: '데이터베이스', level: '상', years: 5 },
  { name: 'Kubernetes', category: '인프라', level: '중', years: 2 },
  { name: 'Python', category: '언어', level: '중', years: 3 },
]) skillRepo.add(s);

addResume({
  kind: 'resume', title: '홍길동 이력서 (백엔드)', is_primary: true, source: 'manual',
  content: `# 홍길동 — 백엔드 엔지니어\n\n## 경력 요약\n결제·정산 도메인 5년. 대규모 트래픽 안정화와 데이터 정합성에 강점.\n\n## 핵심 성과\n- 결제 승인 API p99 320ms→110ms\n- 정산 배치 6시간→40분\n- 연간 거래액 1.2조 무중단 처리`,
});

/** One demo job: posting → optional fit analysis → optional cover letter → status. */
function job(spec: {
  company: string; position: string; location: string; deadline: string;
  description: string; requirements: string[]; keywords: string[];
  status: string; score?: number; fit?: { summary: string; strengths: string[]; gaps: string[]; matched: string[]; missing: string[] };
  cover?: { title: string; content: string };
}) {
  const { job: j } = saveJobPosting({
    company: spec.company, position: spec.position, url: `https://example.com/${encodeURIComponent(spec.company)}`,
    location: spec.location, employment_type: '정규직', description: spec.description,
    requirements: spec.requirements, keywords: spec.keywords, deadline: spec.deadline, source: '데모',
  });
  if (spec.fit && spec.score != null) {
    saveFitAnalysis({
      job_id: j.id, score: spec.score, summary: spec.fit.summary,
      strengths: spec.fit.strengths, gaps: spec.fit.gaps,
      matched_keywords: spec.fit.matched, missing_keywords: spec.fit.missing,
      recommendations: ['지원동기에 결제 도메인 경험을 구체 수치로', '부족 키워드는 학습 의지로 보완'],
    });
  }
  let coverLetterId: number | undefined;
  if (spec.cover) {
    const { coverLetter } = saveCoverLetterVersion({
      job_id: j.id, title: spec.cover.title, content: spec.cover.content, note: '초안', source: 'ai',
    });
    coverLetterId = coverLetter.id;
  }
  if (spec.status !== 'draft') updateApplicationStatus(j.id, spec.status, `데모: ${spec.status}`);
  return { jobId: j.id, coverLetterId };
}

// 최종 합격
job({
  company: '쿠팡', position: '백엔드 엔지니어 (정산플랫폼)', location: '서울 송파', deadline: '2026-05-30',
  description: '대규모 정산 플랫폼의 안정성과 확장성을 책임질 백엔드 엔지니어를 찾습니다.',
  requirements: ['Java/Kotlin 백엔드', '대규모 트래픽', '정산 도메인'], keywords: ['Java', 'Spring', 'Kafka', '정산', 'MSA'],
  status: 'final_passed', score: 91,
  fit: { summary: '정산 도메인 경험이 공고와 거의 완벽히 일치합니다.', strengths: ['정산 파이프라인 설계 경험', '대규모 트래픽 안정화'], gaps: ['Kotlin 실무 경험'], matched: ['Java', 'Spring', 'Kafka', '정산'], missing: ['Kotlin'] },
  cover: { title: '쿠팡 정산플랫폼 자기소개서', content: '저는 "정산은 단 1원도 틀려선 안 된다"는 원칙으로 일해 왔습니다...(데모)' },
});

// 면접
const naver = job({
  company: '네이버', position: '서버 개발자 (페이)', location: '경기 성남', deadline: '2026-07-10',
  description: '네이버페이 결제/정산 백엔드를 함께 만들 서버 개발자를 찾습니다.',
  requirements: ['Java 백엔드', '결제 시스템 경험', '대용량 처리'], keywords: ['Java', 'Spring', '결제', '대용량'],
  status: 'interview', score: 84,
  fit: { summary: '결제 백엔드 경험과 강하게 일치하며 대용량 처리 성과가 돋보입니다.', strengths: ['결제 API 성능 개선(p99)', '대용량 트래픽 경험'], gaps: ['검색 도메인 경험은 제한적'], matched: ['Java', 'Spring', '결제'], missing: ['대용량 검색'] },
  cover: { title: '네이버페이 자기소개서', content: '결제 시스템의 신뢰성을 숫자로 증명해 온 백엔드 엔지니어입니다...(데모)' },
});
saveInterviewPrep({
  job_id: naver.jobId,
  questions: [
    { question: '결제 승인 API 응답시간을 어떻게 개선했나요?', intent: '성능 개선 접근법', followups: ['병목은 어떻게 찾았나요?'], answer_outline: '프로파일링으로 커넥션 풀 병목 발견 → 캐시 도입 → p99 320→110ms.' },
    { question: '데이터 정합성이 깨질 뻔한 경험은?', intent: '장애 대응', followups: ['멱등성 보장은?'], answer_outline: '정산 재처리 중복 지급 위험 → 멱등키+분산락으로 해결.' },
  ],
  star_guides: [
    { question: '가장 큰 기술적 성과', situation: '정산 배치 6시간 소요', task: '처리 시간 단축', action: 'Kafka 이벤트 스트리밍 재설계', result: '6시간→40분, 지연 0건' },
  ],
  self_introduction: '안녕하세요. 결제·정산 도메인에서 5년간 "정확함"을 지켜온 백엔드 엔지니어 홍길동입니다...(데모 1분 자기소개)',
  notes: '결제 도메인 질문 집중 예상. 정량 수치 암기.',
});

// 서류 합격
const toss = job({
  company: '토스', position: '백엔드 엔지니어 (결제)', location: '서울 강남', deadline: '2026-07-15',
  description: '토스 결제 시스템의 안정성과 확장성을 책임질 백엔드 엔지니어를 찾습니다.',
  requirements: ['Java/Kotlin 백엔드', '대규모 트래픽', '결제/정산 도메인 이해'], keywords: ['Java', 'Kotlin', 'Spring', 'Kafka', '결제', 'MSA'],
  status: 'document_passed', score: 88,
  fit: { summary: '결제·정산 경험과 대규모 트래픽 이력이 요구사항과 강하게 일치합니다.', strengths: ['결제/정산 5년', 'p99 개선 성과', 'Kafka 이벤트 처리'], gaps: ['Kotlin 실무 경험 부족', 'MSA 리딩 제한적'], matched: ['Java', 'Spring', 'Kafka', '결제'], missing: ['Kotlin', 'MSA'] },
  cover: { title: '토스 백엔드 자기소개서', content: '저는 결제 시스템의 "한 푼도 틀리면 안 된다"는 긴장감 속에서 성장했습니다...(데모)' },
});
saveCoverLetterVersion({
  cover_letter_id: toss.coverLetterId,
  content: '저는 결제 시스템의 "한 푼도 틀리면 안 된다"는 긴장감 속에서 성장했습니다. 페이테크에서 결제 승인 API의 p99 응답시간을 320ms에서 110ms로 줄이며...(데모 v2)',
  note: '지원동기와 정량 성과 보강', source: 'edit',
});

// 지원 완료
job({
  company: '카카오페이', position: '백엔드 엔지니어 (정산)', location: '경기 판교', deadline: '2026-07-20',
  description: '카카오페이 정산 시스템 백엔드 개발자를 찾습니다.',
  requirements: ['Java/Kotlin', 'MSA', '정산/회계 이해'], keywords: ['Java', 'Kotlin', 'MSA', '정산'],
  status: 'applied', score: 79,
  fit: { summary: '정산 경험은 강하나 MSA 전환 리딩 경험 보강이 필요합니다.', strengths: ['정산 도메인 경험', '데이터 정합성'], gaps: ['MSA 리딩', 'Kotlin'], matched: ['Java', '정산'], missing: ['Kotlin', 'MSA'] },
  cover: { title: '카카오페이 자기소개서', content: '정산의 정확성과 속도를 동시에 끌어올린 경험을 가지고 있습니다...(데모)' },
});

// 지원 예정
job({
  company: '당근', position: '서버 개발자 (커머스)', location: '서울 강남', deadline: '2026-08-01',
  description: '당근 중고거래/커머스 백엔드 서버 개발자를 찾습니다.',
  requirements: ['Java/Kotlin 또는 Go', '대용량 트래픽', '커머스 도메인'], keywords: ['Java', 'Go', '대용량', '커머스'],
  status: 'planned', score: 73,
  fit: { summary: '대용량 처리 경험은 적합하나 커머스 도메인 노출은 초기 경력에 한정됩니다.', strengths: ['대용량 트래픽', '주문/재고 경험'], gaps: ['최근 커머스 경험', 'Go'], matched: ['Java', '대용량'], missing: ['Go', '커머스'] },
});

// 보류
job({
  company: '라인', position: '백엔드 엔지니어 (Fintech)', location: '서울 영등포', deadline: '2026-08-10',
  description: 'LINE Fintech 백엔드 엔지니어를 찾습니다.',
  requirements: ['Java/Kotlin', '글로벌 서비스 경험', '금융 도메인'], keywords: ['Java', 'Kotlin', '금융', '글로벌'],
  status: 'on_hold', score: 70,
  fit: { summary: '금융 도메인은 적합하나 글로벌 서비스 경험이 부족합니다.', strengths: ['금융/결제 도메인'], gaps: ['글로벌 서비스', 'Kotlin'], matched: ['Java', '금융'], missing: ['글로벌', 'Kotlin'] },
});

console.log('✅ 마케팅용 데모 데이터를 생성했습니다.');
console.log(`   위치: ${getDataDir()}`);
console.log('   공고 6건(최종합격·면접·서류합격·지원·예정·보류) · 적합도 6 · 자기소개서 4 · 면접 준비 1');
