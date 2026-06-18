# 거절·피드백 루프 / Rejection Triage & Iteration — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

CareerMate 8단계 상태의 `rejected`를 "죽은 종착점"이 아니라 다음 지원을 개선하는 학습 신호로 환류시키는 도메인이다. 핵심은 (1) 탈락이 어느 게이트에서 났는지 단계 진단, (2) 여러 application의 `rejected` 기록을 가로질러 반복 패턴 감지, (3) 단계별로 차별화된 개선 액션 도출, (4) 정중하고 구조화된 피드백 요청(글로벌·경력 수시채용 한정), (5) 단계·변화증거 기반 재지원 타이밍, (6) 거절 누적에 따른 회복탄력성 관리다. 인접 도메인 `salary-negotiation`은 오퍼 시점의 협상 전술이고, 이 도메인은 그 전후의 "왜 게이트를 못 넘었나 진단 + 다음 사이클 개선"이다.

**중요(스키마 정직성):** 현재 `applications` 테이블은 평면 `status` + 자유텍스트 `notes`뿐이며, 탈락 단계(`rejection_stage`)나 받은 피드백을 담을 **전용 필드가 없다**(`docs/dev/DATA_MODEL.md` L223-237, `packages/shared/src/enums.ts`). 따라서 Phase A에서 단계 분류는 `notes`에 **합의된 접두 패턴**(예: `[stage:interview]`)으로 남기는 근사이고, 전 rejected 집계는 외부 AI의 **수동 집계**다(`get_application_context`는 최근 N건 cap + 동일 회사/직무 history만 반환하므로 자동 cross-tab을 못 준다). 전용 필드·집계 도구는 §5 Phase B에서 제안한다.

## 2. 플레이북

### 원칙

- **탈락을 진단·저장하기 전에 '탈락 단계'를 먼저 분류하라** — 게이트마다 실패 원인과 처방이 정반대다(서류=타겟팅/키워드, 면접=전달/적합도). 단계 enum(권장): `pre_screen`(서류/ATS) · `recruiter_screen`(리크루터 통화) · `aptitude_test`(인적성·코딩테스트, 한국 대기업에서 독립 게이트) · `assignment`(과제) · `interview`(면접) · `final_fit`(최종 fit·연봉·레퍼런스/평판조회) · `ghosted_pre`(서류 직후 무응답) · `ghosted_post`(최종 단계 후 무응답). 단, "어느 게이트였나"의 판정 자체는 사용자 진술/AI 추론이 필요한 **[ai] 작업**이지 토큰 grep으로 풀리지 않는다. _(출처: Pin Funnel Benchmarks; CareerMate DATA_MODEL)_
- **단일 탈락에서 결론을 내지 마라. '구조적'은 비율로 판정하라** — 절대 건수 임계(n=3)는 표본이 희박한 한국 신입/주니어에서 false positive가 많고(면접→오퍼 전환이 낮으면 3연속 면접탈락은 우연으로도 흔하다), 단계가 8개로 쪼개지면 셀당 표본이 더 얕다. 따라서 "진단 가능한 탈락 중 동일 단계가 **≥60%이고 절대건수 ≥3**"일 때만 구조적 신호로 보고, 그 미만은 "신호일 뿐 단정 금지"로 약화하라. 후반 단계(면접)의 산발적 탈락은 정상 분산이다. _(출처: Interview Guys Rejection Recovery; Pin Funnel)_
- **'본인이 못 고치는 탈락'을 1급 카테고리로 분리하라** — 모든 처방을 "내가 무엇을 고칠까"로 몰면 불필요한 자기교정·번아웃을 부른다. 구조적 외부요인 = ① 시장/포지션 미스매치(over/under-qualified·연봉밴드·비자/위치), ② 내정·내부추천(한국 경력 수시채용에서 공고가 형식인 경우), ③ 포지션 클로즈/예산취소, ④ 레퍼런스/평판조회 탈락(전 직장 관계 이슈). 이 넷은 자소서·면접 개선으로 안 풀리므로 "넘길 거절"로 표시한다. _(출처: 그리팅 HR 블로그; 블라인드 실무자 스레드)_
- **피드백 요청은 짧고 구체적이고 비도전적으로** — (a) 통보 후 24시간~1주, (b) 6문장 이하, (c) 일반론 대신 구체 질문 2~3개, (d) 결정 번복 시도 없이. 긴 메일은 회신율을 떨어뜨리고, 구체 질문은 답변 구조를 미리 제공한다. _(출처: Arcadia Career Launchpad; CareerSidekick)_
- **한국 공채에는 피드백 요청을 권하지 말고 자가진단으로 분기하라** — 공채는 합격자에게만 연락하고 일괄/무통보 탈락이 표준이라 개별 환류가 구조적으로 어렵다. 글로벌 조언을 그대로 적용하면 무응답 좌절만 키운다. 대신 인접 공고 `requirements` 역추적 + `fit_analysis.missing_keywords`/`gaps`로 갭을 자가추정하라. 피드백 요청은 '리크루터가 개인적으로 연락한 경력·수시·외국계'로 한정한다. _(출처: 그리팅 HR; 프라임커리어)_
- **재지원은 '시간 AND 변화 증거' 조건으로** — 시간 경과만으로는 같은 결과가 나온다. 실제 레버는 포지션 재공고·조직변화·새 hiring manager·본인의 가시적 변화(승진/자격증/프로젝트)다. 쿨다운 가이드(수시채용 기준): 서류만 탈락+다른 포지션=즉시 / 면접까지=3~6개월 / 동일 포지션=6~12개월. **단 한국 정기공채는 '다음 회차(상·하반기, 약 6개월 사이클)'가 자연 쿨다운**이므로 월수 대신 다음 공채 회차로 안내한다. 재지원 자소서엔 '지난 지원 이후 무엇이 달라졌는지'를 명시한다. _(출처: Indeed Reapply Guide; 프라임커리어)_
- **재지원 자소서는 '유지할 강점'과 '보완할 증거'를 분리해 차등 수정하라** — 무수정 재사용은 같은 탈락을 반복하고, 전면 재작성은 잘 맞던 부분까지 버린다. 추상 형용사를 행동+수치로 치환하는 것이 서류 단계의 핵심 레버다('꼼꼼함' → '출고 전 2회 교차검증, 6개월 오배송 0건'). 사실·수치·고유명사는 보존한다. _(출처: 프라임커리어/잡스미스르; Arcadia)_
- **거절 누적을 정서 신호로 게이팅하되 진단 과잉을 동시에 막아라** — 단기(30일) 내 rejected ≥5건이면 회복탄력성 모드: 'What's wrong with me'→'What can I learn' 인지 재구성, 거절 1건당 자기돌봄 1회, base rate 상기(성공적 구직도 평균 5~10 거절 포함). **동시에 과잉 진단을 fail 신호로 둔다** — 무응답·공채 일괄탈락까지 모두 깊게 파면 번아웃이 가속된다. _(출처: Interview Guys Rejection Fatigue; Psychology Today)_
- **진단을 '느낌'이 아니라 기존 데이터로 정량 앵커하라** — rejected 건들의 단계 분포, 각 건의 직전 `fit_analysis.score`/`missing_keywords`/`gaps`(주의: 공고당 fit_analysis는 1:N, `getByJob`은 `updated_at DESC` **최신 1건**을 돌려줌), 사용한 resume/cover_letter 버전을 묶어 표를 만들고 패턴을 읽어라. _(출처: CareerMate DATA_MODEL fit_analyses/applications)_

### Do

- 탈락 저장 시 단계를 먼저 분류하고, 전용 필드가 없으므로 `notes`에 합의된 접두 패턴(예: `[stage:interview] 사유=... 받은피드백=...`)으로 구조화해 남긴다.
- 과거 rejected를 진단할 땐 `get_application_context`의 `recent_applications`가 **기본 10건 cap**임을 인지하고, 지원이 11건 이상이면 누락 가능성을 사용자에게 고지한 뒤 수동 집계로 단계 분포표를 만든다(또는 §5의 `get_rejection_patterns` 선행).
- 구조적 결론은 "동일 단계 ≥60% 비율 + 절대건수 ≥3"일 때만 내리고, 그 미만은 "아직 신호 수준"으로 말한다.
- '본인이 못 고치는 탈락'(미스매치·내정·포지션 클로즈·레퍼런스)을 먼저 배제하고, 자기교정 액션은 그 다음에 제시한다.
- 피드백 요청 메일은 6문장 이하·구체 질문 2~3개·결정 비도전·1주 내(글로벌/경력/외국계 한정)로 작성한다.
- 한국 공채는 메일 대신 인접 공고 `requirements` 역추적 + `missing_keywords`/`gaps` 자가진단으로 다음 자소서 액션을 만든다.
- 재지원은 단계별 쿨다운 + '가시적 변화 증거'를 함께 묻고, 한국 정기공채는 다음 공채 회차로 안내한다.
- 재지원 자소서는 강점/증거를 분리해 차등 수정하고 추상 형용사를 행동+수치로 치환한다(사실·수치·고유명사 보존).
- 면접 단계 탈락이면 해당 job의 `interview_prep.notes`(면접 후기, 공고당 1건)를 읽어 막힌 질문을 STAR 갭으로 환원하고 다음 `prepare_interview`에 반영한다.
- 단기 거절 ≥5건이면 회복탄력성 모드 + 실행 액션 ≥1을 함께 준다(위로만 금지). 무응답·공채 일괄탈락은 깊이 진단하지 않는다.
- 도출한 개선 액션을 다음 도구 입력으로 명시 연결한다(예: '정량화 부족' → 다음 `save_cover_letter_version` 작성 지침).

### Don't

- 단 1건의 거절(특히 면접)에서 '내 이력서/역량이 문제'라고 단정한다.
- 탈락 단계를 묻지/분류하지 않고 일반론적 '더 노력하세요'를 준다.
- 절대 건수 3건만으로 '구조적'이라 단정한다(비율·표본 무시).
- 모든 거절을 동일 깊이로 진단해 사용자를 거절 피로로 몬다(무응답·공채 일괄탈락까지 파헤침).
- 피드백 요청 메일에서 결정을 번복하려 하거나, 길고 감정적으로 쓰거나, 답변을 강요한다.
- 한국 공채 지원자에게 '리크루터에게 피드백 요청하세요'를 그대로 권한다.
- 재지원 자소서를 이전 버전 그대로 재사용하거나, 반대로 잘 맞던 부분까지 전면 재작성한다.
- 같은 회사 동일 포지션에 쿨다운/변화 증거 없이 즉시 재지원하게 둔다.
- 미스매치·내정·레퍼런스 탈락을 '본인 개선'으로 처방해 헛수고를 시킨다.
- `fit_analysis`의 `score`/`gaps`/`missing_keywords` 같은 기존 데이터를 안 보고 추측으로 진단한다.
- STAR/자소서에서 사실·수치·회사명을 '개선'이라는 명목으로 바꿔치기·과장한다.

### 워크드 예시 (Before → After)

1. **Before:** 사용자 '또 떨어졌어요.' → AI '괜찮아요, 다음엔 잘 될 거예요. 이력서를 좀 더 다듬어 보면 어떨까요?'
   **After:** AI가 먼저 단계 분류 — '어느 단계에서 마무리됐나요 — 서류, 인적성/리크루터 통화, 과제, 면접, 최종?' 사용자가 '면접 2차'라 답하면, 과거 rejected 4건을 수동 집계(recent_applications 10건 cap 고지)해 분포표 제시: 서류 통과 4/4, 면접 탈락 3/4(=동일 단계 75%, 절대 3건 → 구조적 신호). '서류는 잘 통과하시니 이력서 문제가 아니라 면접 전달이 반복 병목입니다.' 미스매치/내정 가능성 1차 배제 후, 해당 job의 `interview_prep.notes`에서 '역량검증 질문 구체 사례 약함'을 STAR 갭으로 환원, 다음 `prepare_interview` 액션 3개 제시.
   **왜 더 나은가:** 단일 위로 대신 단계 진단 → 비율(75%≥60%)+절대건수(≥3) → 데이터 앵커(4/4 통과) → 정확한 병목 → 실행 액션. '이력서 다듬기'라는 잘못된 처방(서류는 멀쩡)을 피한다.

2. **Before:** 피드백 요청 메일(글로벌 경력직) — '안녕하세요, 불합격 통보 받았는데 정말 이해가 안 됩니다. 제가 가장 적합했다고 생각하는데 어떤 점이 부족했는지 전부 알려주시고, 재고해 주실 수 있는지도 부탁드립니다.' (12문장, 결정 재고 요청)
   **After:** '안녕하세요 OOO님, 이번 [직무] 채용 결과 잘 받았습니다. 기회에 감사드립니다. 향후 지원에 참고하고자 두 가지만 여쭙고 싶습니다: (1) 제 [데이터 파이프라인] 경험이 이 역할 기대 수준에 비해 부족했던 부분이 있었을까요? (2) 면접에서 더 보완하면 좋을 한 가지를 꼽으신다면요? 짧게라도 의견 주시면 큰 도움이 되겠습니다. 감사합니다.' (6문장, 구체 질문 2개, 결정 비도전, 통보 후 3일 내)
   **왜 더 나은가:** 짧아 회신율↑, 답변 구조를 미리 주는 구체 질문 2개, 결정 비도전으로 관계·재지원 기회 보존. 한국 공채라면 이 메일 자체를 보내지 않고 자가진단 경로로 분기.

3. **Before:** 재지원 자소서(한국, 서류 탈락 후) — 이전 버전 그대로 제출하며 '저는 꼼꼼하고 책임감이 강한 인재입니다.'
   **After:** 유지할 강점(직무 적합 경험)은 보존하되 `fit_analysis.missing_keywords`의 '데이터 기반 의사결정'을 반영해 추상 형용사를 증거로 치환: '출고 전 SKU 2회 교차검증 프로세스를 도입해 6개월간 오배송 0건을 유지했습니다(직전 분기 월 평균 4건).' 서두에 '지난 상반기 지원 이후 OOO 역량을 보강했다'를 1줄 명시.
   **왜 더 나은가:** 무수정 재사용(탈락 반복)과 전면 재작성(잘 맞던 부분 손실)을 모두 피한다. 추상→행동+수치는 서류 단계 핵심 레버이고, 수치는 날조 없이 실제 성과를 정량화한 것. 재지원 인지 문구로 '성장'을 신호한다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게; 의미판단 필요시 [ai]/H 표기) |
|----|-----------|-----------|--------------------------------|
| R1 | 탈락 진단 산출물에 단계가 enum 중 하나로 분류되어 있는가 | 1개 단계 토큰 존재=합격, 미분류/일반론=불합격 | det로는 `pre_screen\|recruiter_screen\|aptitude_test\|assignment\|interview\|final_fit\|ghosted_pre\|ghosted_post` 토큰 존재 여부만 셀 수 있음. **단계 분류의 정확성(어느 게이트였나)은 [ai]/H** — 전용 필드 부재로 notes free-text 토큰 매칭은 false positive 가능하므로 토큰 존재는 보조 신호로만 사용 |
| R2 | 구조적 결론이 비율+절대건수로 근거되었는가 | '구조적/반복/패턴' 표현 시 동일 단계 비율≥60% AND 절대건수≥3 명시=합격; 단정만=불합격 | det/pattern: '구조적\|반복\|패턴' 인근에 백분율(≥60%) 토큰과 정수 카운트(≥3)가 함께 있는지 정규식 검사. 둘 중 하나라도 없이 단정하면 fail |
| R3 | '본인이 못 고치는 탈락'(미스매치/내정/포지션클로즈/레퍼런스)을 배제·표시했는가 | 자기교정 액션 전에 외부요인 1개 이상 검토 언급=합격 | det/pattern: '미스매치\|내정\|내부추천\|포지션 클로즈\|예산\|레퍼런스\|평판조회' 중 1개 이상 토큰 존재 여부 |
| R4 | 피드백 요청 메일이 (a)6문장 이하 (b)구체 질문 2~3개 (c)결정 번복 요청 없음인가 | 세 조건 모두 충족=합격 | det(한국어 규칙): 문장 수는 종결부호(`.`/`?`/`다.`/줄바꿈 + 번호목록 `1)` `2)`)를 합산해 카운트(영어식 마침표 휴리스틱 단독 금지); 물음표 2~3개; '재고\|다시 검토\|번복\|reconsider' 부재(det). 정중함은 [ai]/H |
| R5 | 한국 공채 맥락에서 피드백 요청 비권장+자가진단 대안을 제시했는가 | 공채 신호 시 피드백요청 비권장 AND 자가진단 대안=합격 | det/pattern: 입력에 '공채\|공개채용\|블라인드\|인적성' 신호가 있으면 산출물에 '자가진단\|요건 역추적\|missing_keywords' 류 대안 존재 여부 |
| R6 | 재지원 타이밍이 단계별 차등 + '변화 증거' 조건을 담았는가 | 차등 구간 ≥2개 AND 변화증거 언급=합격; 단일 일률 기간=불합격 | det/pattern: 월 범위 토큰(3~6, 6~12 등) ≥2개 또는 '다음 공채 회차'; 그리고 '변화\|보강\|승진\|자격증\|재공고' 중 1개 토큰 존재 |
| R7 | 진단이 기존 데이터 필드를 인용해 정량 앵커되었는가 | 실제 데이터 필드 1개 이상 인용=합격, 순수 추측=불합격 | det: `score\|gaps\|missing_keywords\|단계 분포\|버전` 중 1개 이상 구체 참조 존재 여부 |
| R8 | 회복탄력성이 임계(단기 5건)에서만 켜지고 실행 액션을 동반했는가 | 거절≥5 시 base-rate 상기+자기돌봄+액션≥1=합격; 위로만=불합격 | det/pattern: 거절 카운트≥5일 때만 '정상\|base rate\|평균 5~10' 류 + 동사형 액션 권고 ≥1. **단 30일 윈도우 카운트는 status 변경 timestamp가 `updated_at` 1개뿐이라 불안정 → 카운트 자체는 H 보조** |
| R9 | 과잉 진단 가드레일 — 동일 응답에서 무응답/공채 일괄탈락까지 모두 깊게 진단하지 않았는가 | 진단 가치 낮은 건을 '넘김'으로 표시=합격; 전건 심층진단=불합격 | det/pattern: 'ghosted\|무응답\|일괄' 건에 대해 '진단 가치 낮음\|깊이 분석하지 않음' 류 표시 존재 여부(음성 체크) |
| R10 | 재지원/STAR에서 사실·수치·고유명사 보존 + 날조 0 | 기존 데이터 대비 신규 수치/회사명 날조 0건=합격 | [ai]/H: 기존 experiences/projects/cover_letter_versions와 대조해 새 수치·고유명사 출처 유무를 의미 판단 |
| R11 | 개선 액션이 다음 도구 산출물 입력으로 명시 연결됐는가 | 액션→다음 도구/단계 연결 1개 이상=합격 | det: `save_cover_letter_version\|prepare_interview\|save_fit_analysis` 도구명 또는 '다음 지원 시 ~를 반영' 류 연결 문장 존재 |

**주요 실패 모드:**
- 단계 토큰이 `notes` free-text에 우연히 등장(예: 무관한 "interview" 언급)해 R1 det가 false positive — 그래서 R1 분류 정확성은 [ai]/H로 강등.
- 절대건수 3만 보고 '구조적' 단정(R2 비율 누락) → 표본 희박 환경에서 과잉 자기교정.
- 미스매치·내정·레퍼런스 탈락을 자기개선으로 처방(R3 미배제) → 헛수고·번아웃.
- 한국 공채에 글로벌 피드백 메일을 그대로 권함(R5) → 무응답 좌절.
- 30일 5건 카운트를 det로 과신(R8) → status timestamp 단일성으로 카운트가 흔들림.
- 위로만 하고 액션 없음(R8) 또는 모든 건 심층진단(R9) → 양극단 실패.

## 4. 출처 (Provenance)

- **Pin — Recruitment Funnel Benchmarks 2026** — 단계별 전환율 벤치마크(미국/글로벌)와 '정상 분산' 정량 감각. **단, 단일 벤더(2차) 단일 출처이고 직군·연차·국가에 따라 수배 흔들리며 한국 공채 funnel(서류→인적성→실무→임원)과 구조가 다르므로 절대 퍼센트를 base rate로 박제하지 말고 '본인 funnel 단계 간 상대 낙폭'으로 사용.** 한국 전환율 정량 앵커는 공개 데이터 부재. · https://www.pin.com/blog/recruitment-funnel-benchmarks/
- **Arcadia University Career Launchpad — Ask for Feedback After Rejection** — 피드백 요청 메일 구조·타이밍·구체 질문·금기. 대학 커리어센터(1차 성격). · https://careerlaunchpad.arcadia.edu/blog/2024/10/30/how-to-ask-for-feedback-after-job-rejection-with-examples/
- **CareerSidekick — Asking for Feedback: Do's and Don'ts** — 짧게·구체질문·결정 비도전·1주 내. 2차(실무 코칭). · https://careersidekick.com/asking-feedback-job-rejection/
- **Indeed Career Guide — How To Reapply After Rejection** — 재지원 쿨다운(면접 3~6개월, 일반 6~12개월) 및 갱신 원칙. 2차(벤더). 한국 정기공채에는 '다음 회차' 분기 적용. · https://www.indeed.com/career-advice/finding-a-job/reapply-for-a-job
- **The Interview Guys — Rejection Recovery & Rejection Fatigue** — 거절 피로 정의·인지 재구성·base rate(평균 5~10 거절 정상). 2차. · https://blog.theinterviewguys.com/coping-with-job-rejection-fatigue/
- **Psychology Today — Overcome the Pain of Job Rejection** — 인지 재구성·정서 처리·자기돌봄 심리학 근거. 2차(심리). · https://www.psychologytoday.com/us/blog/frazzlebrain/202303/how-to-overcome-the-pain-of-job-rejection-0
- **프라임커리어 / 잡스미스르 — 재지원 시 바꿀 것·남길 것, 서류 탈락 사유** — 한국 맥락 차등 수정(강점 유지·증거 보완, 추상→구체), 이전 버전 재사용 금지. 2차(한국). · https://prime-career.com/student_article/1405
- **그리팅/나인하이어 HR 블로그 + 블라인드 실무자 스레드** — 한국 공채가 개별 피드백을 거의 주지 않고 합격자에게만 연락하는 현실(일괄/무통보 표준), 내정·내부추천 가능성 → 로케일 분기 근거. 2차(벤더 HR/커뮤니티). · https://blog.greetinghr.com/for-hr-reject-mail-information/
- **CareerMate `docs/dev/DATA_MODEL.md` + `packages/shared/src/enums.ts` + `packages/core/src/context.ts` + `packages/db/src/repositories.ts`** — 1차(코드베이스). 확인된 사실: `applications`는 평면 `status`+`notes`만 있고 단계/피드백 전용 필드 없음(L223-237); `rejected`는 `ALLOWED_STATUS_TRANSITIONS`상 draft 포함 7개 상태로 재전이 가능한 **비종착 상태**(enums.ts L74) — 따라서 '평면 종착점' 서술은 부정확하고, 진짜 빠진 건 '탈락 단계/사유의 구조화 저장'뿐; `fit_analyses`는 공고당 1:N이고 `fitRepo.getByJob`은 `ORDER BY updated_at DESC LIMIT 1`로 **최신 1건**을 돌려줌(repositories.ts L652-656); `get_application_context`는 `recent_applications` 기본 10건 cap + 동일 회사/직무 `related_history`만 반환하므로 전 rejected 자동 cross-tab 경로 없음(context.ts L40-55); `interview_preps.notes`='면접 후기/메모' 공고당 1건(L268).

> 제거된 무근거 통계: 원본 principles의 '79%는 피드백을 받으면 재지원 의사가 있다'와 '기술직 면접→오퍼 ~7%'(단계 정의 불명, funnel과 결합 시 비현실적)는 sources에 출처 매핑이 없어 삭제했다.

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - 신규 쓰기 도구 `save_rejection_review`(job_id에 묶임, UNIQUE): 입력 `{job_id, rejection_stage(enum 8: pre_screen|recruiter_screen|aptitude_test|assignment|interview|final_fit|ghosted_pre|ghosted_post), external_factor?(mismatch|internal_candidate|position_closed|reference_check|none), perceived_reason?, feedback_received?, lessons[]?, improvement_actions[]?, reapply_eligible_after?(YYYY-MM)}`; 저장 후 `activities`에 `type='rejection_reviewed'` 로그. → 이것이 R1을 **진짜 det**로 만든다(전용 enum 필드).
  - 신규 읽기 도구 `get_rejection_patterns`(인자 없음): 모든 `status='rejected'` application을 모아 단계별 카운트 + 각 건의 최신 `fit_analysis.score`/`missing_keywords`/사용 cover_letter 버전을 cross-tab해 `{stage_counts, structural_signal_stage?(비율≥60% AND 카운트≥3인 단계), recurring_missing_keywords[], rejected_in_window_30d}` 반환 → 외부 AI가 LLM 없이 패턴을 읽도록 사전계산 제공(현재 수동 집계·10건 cap 한계 해소).
  - 보조 `get_reapply_timing(job_id)` → 마지막 단계 + external_factor 기반 권장 쿨다운/재지원 가능일(한국 공채면 '다음 회차'). `update_application_status`가 `rejected`로 바뀔 때 `document_passed` 힌트 패턴을 재사용해 'save_rejection_review로 다음 지원에 환류하세요' 힌트 동봉.
- **데이터 형태 힌트:**
  - 신규 테이블 `rejection_reviews`(job_id UNIQUE FK, stage TEXT enum, external_factor TEXT?, perceived_reason TEXT?, feedback_received TEXT?, lessons TEXT(JSON), improvement_actions TEXT(JSON), reapply_eligible_after TEXT(YYYY-MM)?, created_at/updated_at). 전방향 멱등 마이그레이션 1건(`CREATE TABLE IF NOT EXISTS`).
  - `enums.ts`에 `REJECTION_STAGES`(8개)와 `REJECTION_EXTERNAL_FACTORS` 추가, `ACTIVITY_TYPES`에 `'rejection_reviewed'` 추가, `ENTITY_TYPES`에 `'rejection_review'` 추가.
  - 30일 윈도우 카운트(R8)를 det로 신뢰하려면 status 변경 이력을 별도로 남겨야 함 — 현재는 `updated_at` 1개뿐이고 `activities.application_status_changed`의 summary가 자유텍스트라 카운트가 불안정하다. `rejection_reviews.created_at`을 rejected 진입 시각의 안정 앵커로 사용.
  - `get_application_context`를 확장해 해당 job의 `rejection_review` + 최신 `fit_analysis`를 함께 묶어 반환하면 진단 컨텍스트가 1콜로 완성(단, 전역 rejected 집계는 별도 `get_rejection_patterns`가 담당하도록 역할 분리).
