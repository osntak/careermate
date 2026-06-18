# 교차 산출물 일관성 (Cross-artifact consistency) — CareerMate 교차검증 루브릭 (Phase A)

> 이 검증기는 연결된 AI가 커리어 산출물(이력서·자소서·면접 답변·LinkedIn 등)을 점검할 때 적용하는 **크리틱 루브릭**이다. CareerMate는 루브릭을 제공하고, 실제 검사는 연결된 AI가 수행한다(내부 LLM 없음).

## 1. 목적

지원자의 여러 산출물(resume ↔ cover letter ↔ 면접 스토리 ↔ LinkedIn)이 **하나의 일관된 사실 서사**를 말하도록 보장한다. 채용 담당자는 "triangulation(삼각 대조)" — 즉 이력서를 LinkedIn·자소서·공개 데이터와 교차 대조해 진위를 확인한다. 따라서 **날짜·직함·회사명·학력·수치·핵심 서사**가 산출물 간에 모순되면 즉시 의심·탈락·평판 손상으로 이어진다.

이 검증기가 보장하는 것:

- **단일 진실 원천(single source of truth):** 이력서를 기준으로 다른 산출물이 이력서와 **모순되지 않음**(확장·강조는 허용, 변조·충돌은 불가).
- **사실 앵커의 동일성:** 같은 사실(입·퇴사 월/년, 직함, 회사명, 학위·졸업년도, 정량 수치)이 모든 산출물에서 **같은 값**으로 나타남.
- **서사의 무모순:** 면접 스토리·자소서가 이력서의 타임라인·역할과 충돌하지 않음(예: 이력서엔 없는 "팀 리드" 주장 등).

이 검증기는 *문장이 좋은가*(품질)가 아니라 *서로 어긋나지 않는가*(정합성)만 본다. LLM 없이도 값 비교·존재 여부·개수로 다수 항목을 셀 수 있게 설계했다.

## 2. 검사 항목

> 측정 단위: "사실 앵커(fact anchor)" = (회사명, 직함, 시작 월/년, 종료 월/년, 정량 수치, 학위명, 졸업년도) 같은 **비교 가능한 토큰**. 검사는 산출물별로 앵커를 추출해 **쌍대 비교(pairwise)** 한 뒤 불일치 개수를 센다.

| ID | 검사 | 합격 기준 | 측정 방법(셀 수 있게) |
|----|------|-----------|------------------------|
| C1 | 회사명 일치 | 모든 산출물에서 동일 회사를 **같은 표기**(정규화 후)로 지칭. 불일치 0건 | 각 산출물의 회사명 토큰을 추출→소문자·법인접미사(Inc/Ltd/㈜) 정규화 후 집합 비교. 다른 표기로 같은 시기를 지칭하는 쌍 개수 = 0 |
| C2 | 직함 일치 | 같은 재직 기간의 직함이 산출물 간 동일하거나 명시적 승진 progression. 모순 0건 | (회사, 기간)별 직함 문자열 비교. 동일 (회사,기간)에 서로 다른 직함이 매핑된 쌍 개수 = 0 |
| C3 | 입·퇴사 날짜 일치 | **월/년 단위**까지 동일. 허용 오차 0개월(채용 배경조사 기준 권장) | 각 경력의 (start MM/YYYY, end MM/YYYY)를 산출물 간 비교. 월 단위 차이가 있는 쌍 개수 = 0. (연도만 적힌 산출물이 있으면 "월 누락" 경고 1건 카운트) |
| C4 | 타임라인 무모순(중복/공백) | 경력 구간이 산출물 간 동일한 정렬·중복 여부. 한 산출물에만 존재하는 미설명 공백/중복 0건 | 경력 구간을 시간순 정렬 후 산출물 간 구간 집합 차이(set difference) 개수 = 0. 6개월 이상 미설명 공백은 별도 플래그(개수) |
| C5 | 학력 일치 | 학위명·전공·학교·졸업년도가 모든 산출물에서 동일. 불일치 0건 | (학교, 학위, 졸업년도) 튜플을 산출물 간 비교. 불일치 튜플 쌍 개수 = 0 |
| C6 | 정량 수치 일치 | 같은 성과의 수치(%, 금액, 인원, 기간)가 산출물 간 동일. 충돌 0건 | 각 산출물에서 숫자+단위 패턴(`\d+%`, 금액, `\d+명` 등) 추출→같은 성과에 매핑된 수치쌍 비교. 값이 다른 쌍 개수 = 0 |
| C7 | 면접 스토리 앵커 정합 | 면접 STAR 스토리의 회사·역할·시기·수치가 이력서 앵커에 **존재**. 이력서에 없는 신규 사실 0건 | 면접 답변에서 추출한 (회사/역할/수치) 앵커 중 이력서 앵커 집합에 없는 항목 개수 = 0 |
| C8 | 핵심 스킬/키워드 정합 | 자소서·면접에서 강조한 핵심 역량 상위 N개가 이력서 스킬 섹션에 존재. 누락 ≤ 1 | 자소서/면접 빈출 역량 토큰 상위 N(기본 5)을 이력서 스킬 토큰 집합과 대조→미존재 개수 ≤ 1 |
| C9 | 연락처/식별자 일치 | 이름·이메일·전화·LinkedIn URL 등 식별 정보가 산출물 간 동일. 불일치 0건 | 정규식으로 식별자 추출 후 정확 일치 비교. 불일치 필드 개수 = 0 |
| C10 | 산출물 커버리지 | 비교 가능한 산출물이 **2종 이상** 존재해야 교차검증이 의미. 1종이면 "교차검증 불가" 경고 | 입력으로 제공된 산출물 종류 개수 ≥ 2 (미달 시 검사 skip + 경고 1건) |

## 3. 불합격 시 처리(루프 연결)

검사 결과는 **불일치 앵커 목록**으로 반환한다. 각 항목은 `{check_id, artifact_a, artifact_b, value_a, value_b, severity}` 형태.

- **C1·C2·C3·C5·C9 불일치(critical):** 즉시 **이력서를 진실 원천으로 고정**하고, 충돌하는 다른 산출물을 이력서 값에 맞춰 수정 지시. 단, 이력서 자체가 사실과 다르다는 사용자 확인이 있으면 이력서를 먼저 정정한 뒤 전 산출물 동기화. 수정 후 **C1~C9 재검증**(불일치 0 될 때까지 루프).
- **C4 공백/중복(warning):** 6개월+ 미설명 공백은 사용자에게 설명(연수·육아·창업 등) 요청 → 모든 산출물에 동일 문구로 반영. 재검증.
- **C6 수치 충돌(critical):** 어느 수치가 사실인지 사용자에게 확인 → 단일 값으로 통일(과장 금지). 사실·고유명사·수치는 보존이 원칙이므로 임의 평균·추정 금지. 재검증.
- **C7 신규 사실(critical):** 면접 스토리에만 등장하는 사실은 (a) 이력서에 추가하거나 (b) 스토리에서 제거. 두 산출물이 같은 앵커를 공유할 때까지 루프.
- **C8 키워드 누락(warning):** 핵심 역량을 이력서 스킬 섹션에 추가하거나, 자소서/면접에서 과대 강조를 완화. 재검증.
- **C10 커버리지 부족:** 검사를 막지 말고 "교차검증 불가, 산출물 1종만 존재"를 사용자에게 안내. 다른 산출물 추가 시 재실행.
- **종료 조건:** critical 불일치 0건 + warning은 사용자 확인 완료. 통과 시 `save_fit_analysis`/`save_cover_letter_version` 등 다음 단계로 진행, 대시보드 링크 안내.

## 4. 출처 (Provenance)

- **Triangulation / 단일 진실 원천 원칙** — 채용 담당자가 이력서를 LinkedIn·자소서·공개 데이터와 교차 대조해 진위 확인. Washington State University, Carson College of Business 커리어 가이드 · https://business.wsu.edu/resumes-references-and-cover-letters/
- **Resume·Cover Letter·LinkedIn 동기화(직함/날짜/회사명/수치 일치)** — The Interview Guys, "Resume, Cover Letter, and LinkedIn Profile Synchronization" · https://blog.theinterviewguys.com/resume-cover-letter-and-linkedin-profile-synchronization/
- **월/년 단위 날짜 일치, 수치 충돌(40% vs 75%) 신뢰 훼손** — Resume Worded, "Should Your LinkedIn Match Your Resume?" · https://resumeworded.com/should-linkedin-match-resume-key-advice
- **Employment verification(직함·재직기간·역할 확인)** — LinkedIn Business, HR Glossary: Employment Verification · https://business.linkedin.com/in/en/hire/resources/hr-glossary/employment-verification
- **STAR 프레임워크(Situation·Task·Action·Result)와 정량 결과** — MIT Career Advising & Professional Development(CAPD), "The STAR Method for Behavioral Interviews" · https://capd.mit.edu/resources/the-star-method-for-behavioral-interviews/
- **이력서/자소서 STAR bullet과 면접 스토리 정합(같은 정량 성과 재사용)** — San Francisco State University, Career & Leadership Development: Resume/Cover Letter/LinkedIn · https://career.sfsu.edu/resume-cv-cover-letter-linkedin

## 5. Phase B 힌트

- **MCP 도구 아이디어:** `get_verifier({ id: "consistency" })` — 이 루브릭(JSON 직렬화) 반환. `run_consistency_check({ artifacts })` — 연결된 AI가 추출한 앵커 배열을 받아 C1~C10 쌍대 비교를 코드로 수행(LLM 불필요)하고 불일치 목록 반환.
- **데이터 형태 힌트:**
  - 입력: `{ artifacts: [{ type: "resume"|"cover_letter"|"interview"|"linkedin", anchors: { companies, titles, dates, education, metrics, identifiers, skills } }] }`. 앵커 추출(자연어→구조화)은 연결된 AI 담당, 비교 로직은 결정적 코드.
  - 출력: `{ pass: bool, criticals: [...], warnings: [...], mismatches: [{check_id, artifact_a, artifact_b, value_a, value_b}] }`.
  - 저장: `get_application_context`가 이미 프로필·대표 이력서·기존 자소서를 반환하므로, 그 앵커를 캐시해 두면 신규 산출물만 추가 비교 가능. 결과는 `save_fit_analysis`의 일부 메타로 보관 가능.
