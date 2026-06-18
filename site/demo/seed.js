// =============================================================================
// Demo seed data — realistic sample career workspace for careermate.life/demo.
// Loaded fresh into the in-memory demo DB on every page load (and on reset).
// Shapes mirror @careermate/shared *Record types (see packages/shared/src/schemas.ts).
// All timestamps are fixed strings so the demo is deterministic (no Date.now()).
// =============================================================================

// Anchor "now" for relative-time rendering. Recent activity is dated near this.
const T = (iso) => iso; // readability helper

export function buildSeed() {
  return {
    profile: {
      id: 'p1',
      created_at: '2026-05-02T09:00:00.000Z',
      updated_at: '2026-06-14T11:20:00.000Z',
      name: '김하늘',
      email: 'haneul.kim@example.com',
      phone: '010-1234-5678',
      location: '서울 성동구',
      headline: '5년차 백엔드 엔지니어 · 결제/정산 도메인',
      summary:
        '대규모 트래픽의 결제·정산 시스템을 설계·운영해 온 백엔드 엔지니어입니다. ' +
        '장애 대응과 점진적 마이그레이션 경험이 많고, 팀의 배포 파이프라인을 정비해 ' +
        '배포 빈도를 주 1회에서 일 5회로 끌어올렸습니다.',
      desired_roles: ['백엔드 엔지니어', '플랫폼 엔지니어'],
      desired_conditions: '연봉 7,000만원+ · 서울/판교 · 주 2회 이상 재택',
      preferred_tone: '담백하고 구체적인 · 성과는 숫자로',
      emphasis_points: ['결제/정산 도메인 전문성', '대용량 트래픽 안정화', '팀 생산성 개선'],
      links: [
        { label: 'GitHub', url: 'https://github.com/example' },
        { label: '기술 블로그', url: 'https://blog.example.com' },
      ],
    },

    experiences: [
      {
        id: 'e1', created_at: '2026-05-02T09:05:00.000Z', updated_at: '2026-05-02T09:05:00.000Z',
        company: '페이코어', role: '백엔드 엔지니어 (시니어)', employment_type: '정규직',
        start_date: '2022-03', end_date: null, is_current: true,
        description: '결제 게이트웨이와 정산 시스템 백엔드 개발·운영.',
        achievements: [
          '정산 배치 처리 시간을 4시간 → 38분으로 단축 (쿼리·인덱스·병렬화)',
          '결제 승인 API p99 지연 320ms → 110ms 개선',
          '무중단 DB 마이그레이션으로 월 1회 정기 점검 다운타임 제거',
        ],
        tech: ['Java', 'Spring', 'Kafka', 'MySQL', 'Redis', 'Kubernetes'],
        order_index: 0,
      },
      {
        id: 'e2', created_at: '2026-05-02T09:06:00.000Z', updated_at: '2026-05-02T09:06:00.000Z',
        company: '커머스랩', role: '백엔드 엔지니어', employment_type: '정규직',
        start_date: '2019-01', end_date: '2022-02', is_current: false,
        description: '이커머스 주문/재고 도메인 API 개발.',
        achievements: [
          '주문 폭주 시 재고 동시성 버그 해결 (분산 락 도입, 오버셀 0건)',
          '신규 정기배송 기능 백엔드 단독 설계·출시',
        ],
        tech: ['Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
        order_index: 1,
      },
    ],

    projects: [
      {
        id: 'pr1', created_at: '2026-05-02T09:10:00.000Z', updated_at: '2026-05-02T09:10:00.000Z',
        name: '정산 시스템 차세대 리아키텍처', role: '리드',
        description: '레거시 배치 정산을 이벤트 기반 스트리밍 정산으로 전환.',
        highlights: ['Kafka 기반 이벤트 소싱 도입', '정산 정확도 검증 파이프라인 자동화'],
        tech: ['Kafka', 'Java', 'Spring Batch'],
        url: 'https://github.com/example/settlement', start_date: '2023-06', end_date: '2024-01',
        order_index: 0,
      },
      {
        id: 'pr2', created_at: '2026-05-02T09:11:00.000Z', updated_at: '2026-05-02T09:11:00.000Z',
        name: '사내 배포 파이프라인 정비', role: '개인 주도',
        description: 'GitHub Actions + ArgoCD로 카나리 배포 자동화.',
        highlights: ['배포 빈도 주1회 → 일5회', '롤백 평균 12분 → 90초'],
        tech: ['GitHub Actions', 'ArgoCD', 'Kubernetes'],
        url: null, start_date: '2024-02', end_date: '2024-05',
        order_index: 1,
      },
    ],

    skills: [
      { id: 's1', created_at: '2026-05-02T09:12:00.000Z', updated_at: '2026-05-02T09:12:00.000Z', name: 'Java / Spring', category: '언어/프레임워크', level: '상', years: 5, order_index: 0 },
      { id: 's2', created_at: '2026-05-02T09:12:10.000Z', updated_at: '2026-05-02T09:12:10.000Z', name: 'Kafka', category: '인프라', level: '상', years: 3, order_index: 1 },
      { id: 's3', created_at: '2026-05-02T09:12:20.000Z', updated_at: '2026-05-02T09:12:20.000Z', name: 'MySQL / PostgreSQL', category: '데이터베이스', level: '상', years: 5, order_index: 2 },
      { id: 's4', created_at: '2026-05-02T09:12:30.000Z', updated_at: '2026-05-02T09:12:30.000Z', name: 'Kubernetes', category: '인프라', level: '중', years: 3, order_index: 3 },
      { id: 's5', created_at: '2026-05-02T09:12:40.000Z', updated_at: '2026-05-02T09:12:40.000Z', name: 'TypeScript / Node.js', category: '언어/프레임워크', level: '중', years: 3, order_index: 4 },
    ],

    documents: [
      {
        id: 'd1', created_at: '2026-05-03T10:00:00.000Z', updated_at: '2026-06-10T08:30:00.000Z',
        kind: 'resume', title: '김하늘 이력서 (2026)', source: 'upload', is_primary: true,
        tags: ['백엔드', '결제'],
        content:
          '# 김하늘 — 백엔드 엔지니어\n\n## 경력 요약\n결제·정산 도메인 5년. 대용량 트래픽 안정화와 팀 생산성 개선에 강점.\n\n' +
          '## 핵심 성과\n- 정산 배치 4h → 38m\n- 결제 API p99 320ms → 110ms\n- 무중단 마이그레이션으로 정기 다운타임 제거\n',
      },
      {
        id: 'd2', created_at: '2026-05-20T13:00:00.000Z', updated_at: '2026-05-20T13:00:00.000Z',
        kind: 'career_description', title: '경력기술서 — 페이코어', source: 'manual', is_primary: false,
        tags: ['결제'],
        content: '## 페이코어 (2022.03~)\n결제 게이트웨이/정산 백엔드. 상세 프로젝트와 성과는 본문 참조.\n',
      },
    ],

    jobs: [
      {
        id: 'j1', created_at: '2026-06-01T09:00:00.000Z', updated_at: '2026-06-12T09:00:00.000Z',
        company: '토스페이먼츠', position: '백엔드 엔지니어 (결제)', url: 'https://example.com/jobs/j1',
        location: '서울 강남구', employment_type: '정규직',
        description: '결제 코어 시스템을 함께 만들 백엔드 엔지니어를 찾습니다. 대용량 트랜잭션 처리 경험 우대.',
        requirements: ['JVM 기반 백엔드 5년+', '대용량 트래픽 경험', '결제/금융 도메인 우대'],
        keywords: ['Java', 'Spring', 'Kafka', 'MSA', '결제'],
        deadline: '2026-06-30', source: '원티드',
      },
      {
        id: 'j2', created_at: '2026-06-03T09:00:00.000Z', updated_at: '2026-06-11T09:00:00.000Z',
        company: '쿠팡', position: 'Software Engineer, Backend', url: 'https://example.com/jobs/j2',
        location: '서울 송파구', employment_type: '정규직',
        description: '커머스 주문/정산 플랫폼 백엔드. 글로벌 스케일의 분산 시스템.',
        requirements: ['분산 시스템 설계 경험', 'Java 또는 Kotlin', '영어 협업 가능'],
        keywords: ['Java', 'Kotlin', 'AWS', '분산시스템'],
        deadline: '2026-07-15', source: '사람인',
      },
      {
        id: 'j3', created_at: '2026-06-05T09:00:00.000Z', updated_at: '2026-06-05T09:00:00.000Z',
        company: '당근', position: '플랫폼 엔지니어', url: 'https://example.com/jobs/j3',
        location: '서울 서초구', employment_type: '정규직',
        description: '사내 개발 생산성을 끌어올릴 플랫폼 엔지니어.',
        requirements: ['Kubernetes 운영 경험', 'CI/CD 파이프라인 설계', 'Go 또는 Java'],
        keywords: ['Kubernetes', 'CI/CD', 'Platform', 'Go'],
        deadline: null, source: '직접 입력',
      },
      {
        id: 'j4', created_at: '2026-05-25T09:00:00.000Z', updated_at: '2026-06-08T09:00:00.000Z',
        company: '네이버페이', position: '백엔드 개발자 (정산)', url: 'https://example.com/jobs/j4',
        location: '경기 성남시', employment_type: '정규직',
        description: '정산 시스템 백엔드 개발. 배치/스트리밍 정산 경험 우대.',
        requirements: ['Spring Batch 경험', '정산 도메인 이해', 'SQL 최적화'],
        keywords: ['Java', 'Spring Batch', '정산', 'MySQL'],
        deadline: '2026-06-22', source: '원티드',
      },
      {
        id: 'j5', created_at: '2026-05-15T09:00:00.000Z', updated_at: '2026-06-02T09:00:00.000Z',
        company: '배달의민족', position: '서버 개발자', url: 'https://example.com/jobs/j5',
        location: '서울 송파구', employment_type: '정규직',
        description: '주문 중계 플랫폼 서버 개발.',
        requirements: ['Java/Kotlin', '대용량 트래픽', 'MSA 경험'],
        keywords: ['Kotlin', 'Spring', 'MSA'],
        deadline: '2026-06-18', source: '사람인',
      },
      {
        id: 'j6', created_at: '2026-06-10T09:00:00.000Z', updated_at: '2026-06-10T09:00:00.000Z',
        company: '카카오뱅크', position: '백엔드 엔지니어', url: 'https://example.com/jobs/j6',
        location: '경기 성남시', employment_type: '정규직',
        description: '뱅킹 코어 백엔드. 안정성과 정합성이 최우선.',
        requirements: ['금융 도메인 경험', 'Java', '높은 테스트 커버리지 문화'],
        keywords: ['Java', '금융', 'Spring'],
        deadline: '2026-07-05', source: '직접 입력',
      },
    ],

    // job_id → application. status drives the pipeline + board.
    applications: [
      { id: 'a1', created_at: '2026-06-01T10:00:00.000Z', updated_at: '2026-06-13T10:00:00.000Z', job_id: 'j1', status: 'interview', resume_id: 'd1', cover_letter_id: 'c1', applied_at: '2026-06-06', notes: '1차 기술면접 통과, 2차 임원면접 예정' },
      { id: 'a2', created_at: '2026-06-03T10:00:00.000Z', updated_at: '2026-06-09T10:00:00.000Z', job_id: 'j2', status: 'applied', resume_id: 'd1', cover_letter_id: null, applied_at: '2026-06-09', notes: null },
      { id: 'a3', created_at: '2026-06-05T10:00:00.000Z', updated_at: '2026-06-05T10:00:00.000Z', job_id: 'j3', status: 'planned', resume_id: null, cover_letter_id: null, applied_at: null, notes: '지원서 작성 중' },
      { id: 'a4', created_at: '2026-05-25T10:00:00.000Z', updated_at: '2026-06-12T10:00:00.000Z', job_id: 'j4', status: 'document_passed', resume_id: 'd1', cover_letter_id: 'c2', applied_at: '2026-05-28', notes: '서류 합격 — 면접 일정 조율 중' },
      { id: 'a5', created_at: '2026-05-15T10:00:00.000Z', updated_at: '2026-06-02T10:00:00.000Z', job_id: 'j5', status: 'rejected', resume_id: 'd1', cover_letter_id: null, applied_at: '2026-05-18', notes: '서류 탈락' },
      { id: 'a6', created_at: '2026-06-10T10:00:00.000Z', updated_at: '2026-06-10T10:00:00.000Z', job_id: 'j6', status: 'draft', resume_id: null, cover_letter_id: null, applied_at: null, notes: null },
    ],

    fits: [
      {
        id: 'f1', created_at: '2026-06-02T09:30:00.000Z', updated_at: '2026-06-02T09:30:00.000Z', job_id: 'j1',
        score: 88, summary: '결제 도메인 전문성과 대용량 트래픽 경험이 공고 요구와 강하게 맞습니다.',
        strengths: ['결제/정산 5년 실무', 'Kafka·Spring 숙련', 'p99 지연 개선 정량 성과'],
        gaps: ['MSA 전환 리딩 경험은 보강하면 좋음'],
        matched_keywords: ['Java', 'Spring', 'Kafka', '결제'], missing_keywords: ['MSA'],
        recommendations: ['지원동기에 결제 코어 안정화 경험을 앞세우기', 'MSA 관련 학습/사이드 언급'],
      },
      {
        id: 'f2', created_at: '2026-05-26T09:30:00.000Z', updated_at: '2026-05-26T09:30:00.000Z', job_id: 'j4',
        score: 91, summary: '정산 배치 최적화 경험이 공고 핵심 요구와 거의 일치합니다.',
        strengths: ['Spring Batch 정산 실무', '배치 4h→38m 성과', 'SQL 최적화'],
        gaps: ['스트리밍 정산은 프로젝트 경험 1건'],
        matched_keywords: ['Java', 'Spring Batch', '정산', 'MySQL'], missing_keywords: [],
        recommendations: ['정산 정확도 검증 자동화 사례를 구체 수치로 제시'],
      },
      {
        id: 'f3', created_at: '2026-06-04T09:30:00.000Z', updated_at: '2026-06-04T09:30:00.000Z', job_id: 'j2',
        score: 72, summary: '백엔드 역량은 충분하나 글로벌 스케일 분산 시스템 경험은 부분적입니다.',
        strengths: ['대용량 트래픽 안정화', '동시성 문제 해결'],
        gaps: ['글로벌 멀티리전 운영 경험', '영어 협업 빈도'],
        matched_keywords: ['Java', 'AWS'], missing_keywords: ['Kotlin', '분산시스템'],
        recommendations: ['분산 트랜잭션 사례 강조', 'Kotlin 학습 계획 언급'],
      },
    ],

    coverLetters: [
      {
        id: 'c1', created_at: '2026-06-04T11:00:00.000Z', updated_at: '2026-06-08T11:00:00.000Z',
        title: '토스페이먼츠 백엔드 지원동기', job_id: 'j1', is_primary: true,
        current_version_id: 'c1v2', version_count: 2,
        current_content:
          '결제는 한 번의 오류가 곧 신뢰의 손실인 도메인입니다. 페이코어에서 결제 승인 API의 p99 지연을 ' +
          '320ms에서 110ms로 줄이며, 빠르면서도 틀리지 않는 시스템이 무엇인지 체득했습니다. ' +
          '토스페이먼츠의 결제 코어에서 이 경험을 이어가고 싶습니다.',
        versions: [
          { id: 'c1v1', cover_letter_id: 'c1', version_no: 1, content: '(초안) 결제 도메인 경험 중심 지원동기 초안.', note: '초안', source: 'ai', created_at: '2026-06-04T11:00:00.000Z' },
          { id: 'c1v2', cover_letter_id: 'c1', version_no: 2, content: '결제는 한 번의 오류가 곧 신뢰의 손실인 도메인입니다. 페이코어에서 결제 승인 API의 p99 지연을 320ms에서 110ms로 줄이며, 빠르면서도 틀리지 않는 시스템이 무엇인지 체득했습니다. 토스페이먼츠의 결제 코어에서 이 경험을 이어가고 싶습니다.', note: '수치 보강 + 마무리 다듬기', source: 'edit', created_at: '2026-06-08T11:00:00.000Z' },
        ],
      },
      {
        id: 'c2', created_at: '2026-05-27T11:00:00.000Z', updated_at: '2026-05-27T11:00:00.000Z',
        title: '네이버페이 정산 지원동기', job_id: 'j4', is_primary: false,
        current_version_id: 'c2v1', version_count: 1,
        current_content:
          '정산은 정확함이 전부입니다. Spring Batch 기반 정산 배치를 4시간에서 38분으로 줄이면서도 ' +
          '검증 파이프라인을 자동화해 정합성을 지켰습니다. 네이버페이 정산 시스템에 기여하고 싶습니다.',
        versions: [
          { id: 'c2v1', cover_letter_id: 'c2', version_no: 1, content: '정산은 정확함이 전부입니다. Spring Batch 기반 정산 배치를 4시간에서 38분으로 줄이면서도 검증 파이프라인을 자동화해 정합성을 지켰습니다. 네이버페이 정산 시스템에 기여하고 싶습니다.', note: 'AI 생성', source: 'ai', created_at: '2026-05-27T11:00:00.000Z' },
        ],
      },
    ],

    interviews: [
      {
        id: 'iv1', created_at: '2026-06-12T14:00:00.000Z', updated_at: '2026-06-13T09:30:00.000Z', job_id: 'j1',
        self_introduction:
          '안녕하세요, 결제·정산 도메인 5년차 백엔드 엔지니어 김하늘입니다. ' +
          '페이코어에서 하루 수백만 건의 결제 트랜잭션을 다루며, "빠르면서도 절대 틀리지 않는" 시스템을 ' +
          '만드는 데 집중해 왔습니다. 결제 승인 API의 p99 지연을 320ms에서 110ms로 줄였고, ' +
          '정산 배치를 4시간에서 38분으로 단축하면서도 검증 자동화로 정합성을 지켰습니다. ' +
          '토스페이먼츠의 결제 코어에서 이 경험을 한 단계 더 키우고 싶습니다.',
        notes:
          '2차 임원면접 — 컬처핏 + 시스템 설계 위주 예상.\n' +
          '· 결제 도메인에서의 "정확성 vs 속도" 트레이드오프 관점 강조하기\n' +
          '· 페이코어 → 토스페이먼츠 지원 동기(규모/임팩트) 솔직하게\n' +
          '· 역질문: 결제 코어 팀의 온콜/장애 대응 문화, 차세대 정산 로드맵',
        questions: [
          { question: '결제 승인 API의 p99 지연을 어떻게 320ms에서 110ms로 줄였나요?', intent: '성능 최적화의 사고 과정과 측정 기반 접근 확인', followups: ['병목을 어떻게 측정했나요?', '개선의 트레이드오프는 무엇이었나요?', '캐시 정합성은 어떻게 보장했나요?'], answer_outline: 'APM으로 구간별 측정 → 가설(N+1 쿼리·직렬화·커넥션 대기) → 인덱스 재설계·커넥션풀 튜닝·읽기 캐시 순차 적용 → 각 단계 A/B로 효과 검증. 캐시는 TTL+이벤트 무효화로 정합성 유지.' },
          { question: '무중단으로 결제 DB를 마이그레이션한 경험을 설명해 주세요.', intent: '운영 안정성과 단계적 전환 설계 역량', followups: ['롤백 전략은?', '데이터 정합성 검증은?'], answer_outline: '듀얼 라이트 → 과거 데이터 백필 → 신구 비교 검증 → 점진 트래픽 컷오버. 각 단계가 가역적이라 언제든 롤백 가능하게 설계.' },
          { question: '대용량 트래픽에서 동시성 문제를 해결한 사례가 있나요?', intent: '분산 환경 동시성 이해도', followups: ['분산 락의 한계는?', '멱등성은 어떻게 보장했나요?'], answer_outline: '주문 폭주 시 재고 오버셀 → 분산 락(Redis) + 멱등 키로 중복 처리 차단. 락 경합이 큰 구간은 큐 기반 직렬화로 전환해 오버셀 0건 달성.' },
          { question: '결제처럼 정확성이 중요한 도메인에서 장애가 났을 때 어떻게 대응하나요?', intent: '장애 대응 원칙과 우선순위 판단', followups: ['사후 분석은 어떻게 하나요?'], answer_outline: '1) 영향 범위 격리·차단(서킷브레이커) 2) 정합성 우선 — 의심 거래는 보류 처리 3) 복구 후 정산 재대사 4) 블레임리스 포스트모템으로 재발 방지 액션화.' },
          { question: '함께 일하기 좋은 동료/팀 문화는 무엇이라고 생각하나요?', intent: '컬처핏', followups: ['코드 리뷰 문화에 대한 생각은?'], answer_outline: '문제를 숨기지 않고 일찍 공유하는 문화, 그리고 결정의 "왜"를 문서로 남기는 팀. 리뷰는 사람이 아니라 코드/설계를 향하게.' },
        ],
        star_guides: [
          { question: '가장 어려웠던 장애 대응 경험은?', situation: '월말 정산 배치가 지연되며 마감 시한을 넘길 위험에 처함', task: '4시간 내 정산을 정확히 완료하고 재발을 막아야 했음', action: '병목 배치를 병렬화하고 인덱스를 재설계, 핫픽스를 무중단 배포 후 검증 파이프라인으로 정합성 확인', result: '처리 시간을 38분으로 단축하고 이후 동일 장애 재발 0건, 정산 SLA를 안정화' },
          { question: '주도적으로 팀의 문제를 개선한 경험은?', situation: '배포가 주 1회로 묶여 기능 출시가 느리고 롤백이 어려웠음', task: '배포 빈도를 높이면서도 안정성을 잃지 않아야 했음', action: 'GitHub Actions + ArgoCD로 카나리 배포 자동화, 헬스체크 기반 자동 롤백 구성', result: '배포 빈도 주1회 → 일5회, 롤백 평균 12분 → 90초로 단축' },
        ],
      },
    ],

    activities: [
      { id: 'ac1', type: 'application_status_changed', entity_type: 'application', entity_id: 'a1', summary: '토스페이먼츠 — 면접 진행으로 상태를 변경했습니다.', created_at: '2026-06-13T10:00:00.000Z' },
      { id: 'ac2', type: 'interview_prep_saved', entity_type: 'interview_prep', entity_id: 'iv1', summary: '토스페이먼츠 면접 준비 자료를 저장했습니다.', created_at: '2026-06-12T14:00:00.000Z' },
      { id: 'ac3', type: 'application_status_changed', entity_type: 'application', entity_id: 'a4', summary: '네이버페이 — 서류 합격으로 상태를 변경했습니다.', created_at: '2026-06-12T10:00:00.000Z' },
      { id: 'ac4', type: 'cover_letter_version_saved', entity_type: 'cover_letter', entity_id: 'c1', summary: '토스페이먼츠 지원동기 v2를 저장했습니다.', created_at: '2026-06-08T11:00:00.000Z' },
      { id: 'ac5', type: 'fit_analysis_saved', entity_type: 'fit_analysis', entity_id: 'f1', summary: '토스페이먼츠 적합도 분석(88점)을 저장했습니다.', created_at: '2026-06-02T09:30:00.000Z' },
      { id: 'ac6', type: 'job_saved', entity_type: 'job', entity_id: 'j6', summary: '카카오뱅크 공고를 저장했습니다.', created_at: '2026-06-10T09:00:00.000Z' },
      { id: 'ac7', type: 'resume_added', entity_type: 'document', entity_id: 'd1', summary: '김하늘 이력서(2026)를 추가했습니다.', created_at: '2026-05-03T10:00:00.000Z' },
    ],
  };
}
