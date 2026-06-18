/**
 * `npm run seed` — populate the database with realistic demo data so a new user
 * (or the demo walkthrough) immediately sees a populated dashboard. Refuses to
 * run if real data already exists, unless `--force` is passed. Tip: seed into a
 * throwaway location with `CAREERMATE_DATA_DIR=./demo-data npm run seed`.
 */
import {
  profileRepo, experienceRepo, projectRepo, skillRepo, documentRepo, getDataDir,
} from '@careermate/db';
import {
  saveProfile, saveJobPosting, saveFitAnalysis, saveCoverLetterVersion,
  updateApplicationStatus, saveInterviewPrep, addResume,
} from '@careermate/core';

const force = process.argv.includes('--force');

function main(): void {
  if (profileRepo.get()?.name && !force) {
    console.log('⚠️  이미 프로필 데이터가 있습니다. 데모 데이터를 덮어쓰지 않습니다.');
    console.log('   별도 폴더에 넣으려면:  CAREERMATE_DATA_DIR=./demo-data npm run seed');
    console.log('   그래도 진행하려면:     npm run seed -- --force');
    process.exit(0);
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

  // A job with full analysis + cover letter + status + interview prep
  const { job } = saveJobPosting({
    company: '토스', position: '백엔드 엔지니어 (결제)',
    url: 'https://example.com/toss/backend', location: '서울 강남', employment_type: '정규직',
    description: '토스 결제 시스템의 안정성과 확장성을 책임질 백엔드 엔지니어를 찾습니다. 대규모 트래픽 환경에서의 결제/정산 경험을 우대합니다.',
    requirements: ['Java/Kotlin 백엔드 개발 경험', '대규모 트래픽 처리 경험', '결제/정산 도메인 이해'],
    keywords: ['Java', 'Kotlin', 'Spring', 'Kafka', '결제', 'MSA'], deadline: '2026-07-15', source: '데모',
  });
  saveFitAnalysis({
    job_id: job.id, score: 88,
    summary: '결제·정산 도메인 경험과 대규모 트래픽 처리 이력이 공고 요구사항과 강하게 일치합니다. Kotlin 경험만 보완하면 최상위 적합도입니다.',
    strengths: ['결제/정산 도메인 5년 경험', '대규모 트래픽 안정화 성과(p99 개선)', 'Kafka 기반 이벤트 처리 경험'],
    gaps: ['Kotlin 실무 경험 부족(Java는 능숙)', 'MSA 전환 리딩 경험은 제한적'],
    matched_keywords: ['Java', 'Spring', 'Kafka', '결제'], missing_keywords: ['Kotlin', 'MSA'],
    recommendations: ['지원동기에 결제 도메인 애정과 정합성 경험을 구체 수치로 강조', 'Kotlin은 학습 의지+Java 전이 가능성으로 보완'],
  });
  const { coverLetter } = saveCoverLetterVersion({
    job_id: job.id, title: '토스 백엔드 자기소개서',
    content: '저는 결제 시스템의 "한 푼도 틀리면 안 된다"는 긴장감 속에서 성장했습니다...(데모 자기소개서 v1)', note: '초안', source: 'ai',
  });
  saveCoverLetterVersion({
    cover_letter_id: coverLetter.id,
    content: '저는 결제 시스템의 "한 푼도 틀리면 안 된다"는 긴장감 속에서 성장했습니다. 페이테크에서 결제 승인 API의 p99 응답시간을 320ms에서 110ms로 줄이며...(데모 자기소개서 v2 — 지원동기·성과 보강)',
    note: '지원동기와 정량 성과 보강', source: 'edit',
  });
  updateApplicationStatus(job.id, 'document_passed', '데모: 서류 합격 처리');
  saveInterviewPrep({
    job_id: job.id,
    questions: [
      { question: '결제 승인 API 응답시간을 어떻게 개선했나요?', intent: '성능 개선의 깊이와 접근법 확인', followups: ['병목은 어떻게 찾았나요?', '트레이드오프는 없었나요?'], answer_outline: '프로파일링으로 DB 커넥션 풀 병목 발견 → 캐시 계층 도입 → p99 320→110ms. 정합성 유지 위해 캐시 무효화 전략 설명.' },
      { question: '데이터 정합성이 깨질 뻔한 경험과 해결 방법은?', intent: '장애 대응·정합성 사고력', followups: ['멱등성은 어떻게 보장했나요?'], answer_outline: '정산 재처리 시 중복 지급 위험 → 멱등키 + 분산락 도입으로 해결.' },
    ],
    star_guides: [
      { question: '가장 큰 기술적 성과', situation: '정산 배치가 6시간 소요되어 익일 지연', task: '처리 시간 단축', action: 'Kafka 이벤트 스트리밍으로 준실시간 파이프라인 재설계', result: '6시간→40분, 정산 지연 0건' },
    ],
    self_introduction: '안녕하세요. 결제·정산 도메인에서 5년간 "정확함"을 지켜온 백엔드 엔지니어 홍길동입니다...(데모 1분 자기소개)',
    notes: '결제 도메인 질문에 집중 예상. 정량 수치 암기.',
  });

  console.log('✅ 데모 데이터를 생성했습니다.');
  console.log(`   위치: ${getDataDir()}`);
  console.log(`   프로필 1 · 경력 ${experienceRepo.list().length} · 프로젝트 ${projectRepo.list().length} · 기술 ${skillRepo.list().length} · 문서 ${documentRepo.list().length}`);
  console.log('   공고 1(토스, 적합도 88, 서류 합격) · 자기소개서 1(2버전) · 면접 준비 1');
  console.log('\n   `npm start` 로 대시보드를 열어 확인하세요.');
}

main();
