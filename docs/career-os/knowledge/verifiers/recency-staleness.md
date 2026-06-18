# 신선도·시의성 / Recency & Staleness — CareerMate 교차검증 루브릭 (Phase A)

> 이 검증기는 연결된 AI가 커리어 산출물(이력서·자소서·면접 답변·LinkedIn·분석 등)을 점검할 때 적용하는 **크리틱 루브릭**이다. CareerMate는 루브릭을 제공하고, 실제 검사는 연결된 AI가 수행한다(내부 LLM 없음).

## 1. 목적

이 검증기는 **모든 커리어 산출물이 "충분히 최신인 입력 위에서, 그 입력의 수집·기준 시점을 정직하게 드러내며" 만들어졌음**을 보장한다. 즉 적합도 분석은 *현재 버전*의 이력서·JD에 근거했고, 연봉 협상은 *아직 stale하지 않은* 시장 데이터에 근거했으며, 회사 리서치의 "최근 뉴스"가 *실제로 최근*이고, 모든 시점 민감 주장에 **as-of 날짜(기준일)** 가 붙어 있음을 검사한다. 이것은 데이터 품질의 표준 차원인 **timeliness(필요 시점 가용성)·currency(현실 반영 최신성)** 를 커리어 산출물에 적용한 게이트다(DAMA DDQ).

이 검증기가 막으려는 5가지 실패 모드:

- **stale 시장데이터로 협상(stale benchmark):** 6개월·12개월 지난 연봉 벤치마크를 "현재 시세"처럼 인용해 협상 앵커를 잘못 잡음.
- **낡은 뉴스를 "최근"으로 표기(false recency):** 12~18개월 지난 사건을 "최근 출시/투자/조직개편"으로 면접에서 인용 → 준비 부족 노출.
- **버전 드리프트(version drift):** 이력서·JD가 바뀐 뒤에도 옛 버전에 근거한 적합도 분석·자소서를 그대로 사용(재분석 트리거 없음).
- **날짜 없는 시점주장(undated temporal claim):** "최근", "현재", "요즘"이라 하면서 기준일이 없어 검증·갱신 불가능.
- **만료 자격·기간 미갱신(expired credential / open-ended tenure):** 만료된 자격증·인증, "현재 재직 중"인데 종료된 포지션, 미래 졸업/이수 예정을 완료로 표기.

> 경계 원칙: **이 검증기는 "사실이 참인가"(진실성)가 아니라 "그 사실이 아직 유효·최신이고, 시점이 드러나 있는가"(시의성)만 본다.** 사실은 참이어도 6개월 전 데이터면 협상에서는 위험하고, "최근"이라는 라벨은 시점이 붙어야만 검증된다. 이는 진실성(`truthfulness.md`)·일관성(`consistency.md`)과 **독립 축**이다 — 그 둘은 "값이 저장 데이터와 일치/무모순한가"를 보지만, 이 검증기는 "그 값·입력이 *언제* 것이고 *지금도 유효한가*"라는 시간 축을 단독으로 본다.

핵심 제약상 "6개월"의 적정성·뉴스의 실제 최신성 같은 의미 판단은 결정론으로 100% 셀 수 없다. 따라서 항목을 **(가) LLM 없이 날짜 비교·존재여부로 셀 수 있는 결정론 게이트**와 **(나) 연결된 AI가 라벨·맥락을 판정하는 항목**으로 나눠 설계하고, 각 항목에 어느 쪽인지 표시한다.

## 2. 검사 항목

표기: **[det]** = CareerMate가 LLM 없이 셀 수 있는 결정론 체크(날짜 차이·존재여부·정규식·비율). **[ai]** = 연결된 AI가 라벨·의미를 판정(개수로 환원해 보고). 기준일 `now`는 검증 실행 시각(예: 2026-06-17).

| ID | 검사 | 합격 기준 | 측정 방법(셀 수 있게; det/ai 구분) |
|----|------|-----------|------------------------|
| C1 **[det]** | **시장데이터 신선도(benchmark staleness)** — 연봉·보상 벤치마크의 `captured_at`이 임계(기본 6개월) 이내인가 | stale 벤치마크 사용 = **0** (또는 stale 표기 후에만 참고치로 사용) | 협상/오퍼평가에 쓰인 각 benchmark의 `captured_at`과 `now`의 개월차 계산 → `months_diff > 6` 건수 보고. `> 6`인데 산출물에 `stale` 라벨이 없으면 FAIL. `> 12`는 critical |
| C2 **[ai]** | **"최근 뉴스" 스테일 FAIL** — '최근'으로 라벨된 회사 리서치 fact의 출처 날짜가 6개월 이내인가 | 6개월 초과를 "최근"으로 표기 = **0** | `label=='recent'`인 fact의 `dated`(YYYY-MM)와 `now`의 개월차 계산 → `months_diff > 6` 건수 보고. AI는 산문 속 "최근/요즘/현재"가 어느 fact를 가리키는지 매핑. 12~18개월 초과는 `stale`로 강제 라벨 |
| C3 **[det]** | **분석 입력 버전 추적(version provenance)** — 적합도 분석·자소서가 근거한 이력서 버전 ID·JD 식별자가 기록되어 있는가 | `resumeVersionId`·`jobId`(또는 JD 해시) 둘 다 존재 | 산출물 메타에 `resumeVersionId != null && jobId != null` 여부. 하나라도 null이면 FAIL(재분석 트리거 불능) |
| C4 **[det]** | **버전 드리프트 감지(stale analysis)** — 분석이 근거한 이력서·JD 버전이 *현재* 저장 버전과 동일한가 | 드리프트 = **0** | 산출물의 `resumeVersionId`·JD 해시를 저장된 *최신* 버전 ID·해시와 비교 → 불일치 건수 보고. 불일치면 "근거 데이터가 바뀜 → 재분석 필요" 플래그 |
| C5 **[det]** | **시점주장 날짜 부착(dated temporal claims)** — 시점 민감 표현("최근/현재/요즘/올해/지난 분기/now")에 기준일(as-of)이 붙어 있는가 | 날짜 없는 시점주장 = **0** | 정규식 `(최근\|요즘\|현재\|올해\|작년\|지난\s?(분기\|해\|달)\|recent\|currently\|as of\|latest)`로 시점표현 토큰 수 `N_temporal`를 센다 → 같은 절(clause) 내 또는 출처 메타에 `YYYY`/`YYYY-MM` 동반 비율 계산 → 날짜 미동반 건수 보고 |
| C6 **[ai]** | **자격·인증 유효기간(credential expiry)** — 만료일이 있는 자격증·인증(예: AWS/PMP/어학성적 2년 유효)이 `now` 기준 유효한가 | 만료된 자격을 유효처럼 표기 = **0** | 자격 항목의 `expires_at`(또는 취득일+유효기간 규칙)을 `now`와 비교 → 만료 건수 보고. 만료된 항목은 "취득(만료)"로 표기하거나 갱신 안내. 만료일 미상은 `[유효기간 확인 필요]` 1건 |
| C7 **[det]** | **재직·진행 종료시점 정합(open-ended tenure)** — "현재 재직/진행 중(present/현재)"으로 표기된 항목이 실제로 진행 중인가, 미래 완료를 완료로 적지 않았는가 | 모순 = **0** | `현재\|present\|재직 중\|진행 중` 표기 항목 중 저장 타임라인에 `end_date`가 이미 있는 건수, 그리고 `start_date`나 졸업/이수 예정일이 `now`보다 미래인데 "완료/수료"로 표기된 건수 보고 |
| C8 **[ai]** | **시한성 정보 만료(time-bound facts)** — 직무·시장·기술 언급이 더는 유효하지 않은 옛 사실이 아닌가(폐기된 제품/지난 펀딩라운드를 "최신"으로, 단종 기술스택을 "현재 트렌드"로) | 만료된 시한 사실 = **0** | AI가 "최신/현재/지금 뜨는/state-of-the-art" 류 시한성 주장 토큰을 센 뒤, 각 주장에 출처 날짜가 있고 그 날짜가 임계 이내인지 판정 → 날짜 없거나 임계 초과 건수 보고 |
| C9 **[det]** | **신선도 커버리지/비율(freshness ratio)** — 시점 민감 주장 전체 중 (a)날짜가 붙고 (b)임계 이내인 비율 | freshness_ratio = **1.0** | `freshness_ratio = (N_temporal − N_undated − N_stale) / N_temporal`. C1·C2·C5·C8의 분자/분모를 합산해 단일 수치로 보고. 1.0 미만이면 불합격 |

> critical 등급: **C1(>12개월 벤치마크)·C2(12~18개월+ 뉴스를 "최근")·C4(버전 드리프트)** 는 발견 시 해당 산출물을 즉시 불합격 처리(낡은 입력으로 한 협상·리서치·분석 차단). C3은 게이트(없으면 추적 불능 → 불합격). C5·C6·C7·C8은 건수 누적으로 판단하되 0을 목표로 하고, C9는 게이트(1.0이어야 합격). 임계 개월수(6/12/18)는 직무·시장에 따라 조정 가능한 파라미터로 둔다(빠르게 변하는 시장은 더 짧게).

## 3. 불합격 시 처리(루프 연결)

연결된 AI는 아래 순서로 **수정 → 재검증**한다. 재검증은 동일 루브릭 전 항목을 다시 돌려 **C1·C2·C4 critical = 0 이고 C3 존재 = true 이며 C9 freshness_ratio = 1.0** 일 때만 통과로 본다.

1. **분류 먼저.** 각 불합격 항목을 (a) stale 입력 (b) false recency 라벨 (c) 버전 드리프트 (d) 날짜 누락 (e) 만료 자격/기간 중 하나로 라벨링한다.
2. **(a) stale 입력 → 재수집 또는 강등.** stale한 연봉 벤치마크(C1)는 사용자가 **새로 수집**해 `save_compensation_benchmark`로 갱신한 뒤 재분석한다. 즉시 재수집이 불가하면 그 수치를 협상 앵커에서 빼고 "기준일 YYYY-MM, 신선도 주의(참고치)"로 강등 표기한다 — 낡은 수치를 현재 시세로 단정하지 않는다.
3. **(b) false recency → 라벨 정정 또는 교체.** 6개월 초과 뉴스(C2)는 "최근" 라벨을 떼고 날짜를 명시(`2025-08 발표`)하거나, 라이브로 더 최신 뉴스를 찾아 교체한다. 12~18개월 초과는 `stale`로 표기해 면접 인용에서 제외한다.
4. **(c) 버전 드리프트 → 재분석 트리거.** 분석의 `resumeVersionId`·JD 해시가 최신과 다르면(C4), 최신 버전으로 적합도 분석·자소서를 **다시 생성**한다. 사용자에게 "이력서/공고가 바뀌어 이전 분석이 낡았다 → 다시 분석한다"를 쉬운 한국어로 안내한다.
5. **(d) 날짜 누락 → as-of 부착.** 날짜 없는 "최근/현재"(C5)에는 출처 기준일(`YYYY-MM`)을 붙인다. 기준일을 모르면 그 시점 주장을 정성 표현으로 일반화하거나 `[기준일 확인 필요]`로 표시한다(추측 날짜 금지 — 진실성 검증기와 연동).
6. **(e) 만료 자격/기간 → 갱신 또는 표기.** 만료된 자격증(C6)은 "취득(만료, 갱신 필요)"로 표기하거나 사용자에게 갱신 여부를 묻는다. 종료된 포지션의 "현재 재직 중"(C7)은 실제 `end_date`로 정정하고, 미래 졸업/이수 예정은 "YYYY-MM 졸업예정"으로 표기한다.
7. **재검증 게이트.** 수정본을 다시 C1~C9에 통과시킨다. critical(C1>12mo·C2 stale·C4 드리프트) 중 하나라도 남으면 루프를 반복한다. 시장 데이터 재수집이 사용자 액션을 요구하면(2회 시도 후에도 미해결), 해당 보상 수치를 산출물에서 보류하고 사용자에게 수집을 요청한다(낡은 값으로 무한 진행 금지).
8. **저장.** 통과한 산출물만 저장 도구(`save_fit_analysis`·`save_cover_letter_version`·`save_interview_prep`·`save_compensation_benchmark` 등)로 보관한다. 검증 결과 요약(`freshness_ratio=1.0`, `stale=0`, `as_of=YYYY-MM`, 근거 버전 ID)을 산출물 메타에 함께 남겨 다음 재분석 트리거의 기준으로 삼는다.

## 4. 출처 (Provenance)

- **DAMA DDQ — Dimensions of Data Quality (timeliness / currency)** (1차/표준, 신뢰 높음) — 데이터 품질의 표준 차원으로 **timeliness**(필요 시점에 가용)와 **currency**(현실을 얼마나 최신으로 반영) 정의. 이 검증기를 "커리어 데이터의 timeliness·currency 게이트"로 정초하는 1차 근거. · DAMA-NL, "Dimensions of Data Quality (DDQ) Research Paper v1.2" https://www.dama-nl.org/wp-content/uploads/2020/09/DDQ-Dimensions-of-Data-Quality-Research-Paper-version-1.2-d.d.-3-Sept-2020.pdf
- **timeliness vs freshness vs currency 구분** (2차/벤더, 보강) — "timeliness=필요 시점 가용, freshness=사용 순간의 최신성, currency=현실과의 최신 일치(6개월 전 이사면 currency 결여)"라는 실무 정의. C5(as-of)·C1·C2 설계의 보강 근거. · Soda, "Data Quality Dimensions: The No-BS Guide" https://soda.io/blog/guide-to-data-quality-dimensions
- **연봉 시장데이터의 stale 위험·갱신 주기** (2차/벤더, 정성적 방향성) — 보상 밴드가 통상 1년 이상 묵은 데이터로 구축되고, 시장이 빠르게 움직여 stale data가 임금 격차·salary inversion을 낳음. 제공자는 monthly/quarterly, 최신은 weekly/daily 갱신 — **데이터 recency를 반드시 검증하라**는 실무 권고. C1(6개월 임계·stale 플래그)의 직접 근거. · JobsPikr, "Pay Equity Analytics: Stop Using Outdated Salary Data" https://www.jobspikr.com/blog/pay-equity-analytics-compensation-benchmarking/ · Ravio, "How to use market pricing for compensation" https://ravio.com/blog/market-pricing-compensation
- **연봉 협상 데이터 시의성** (2차/업계, 보조) — 의사 등 빠르게 변하는 직무 시장은 연 1회 서베이로는 부족, 협상엔 더 current한 자료가 필요. C1의 시장별 임계 조정(빠른 시장=짧은 임계) 근거. · American Medical Association, "Must-have dataset for physician salary negotiations" https://www.ama-assn.org/medical-residents/transition-resident-attending/check-out-must-have-dataset-physician-salary
- **회사 리서치의 "최근 뉴스" 시의성** (대학 커리어센터/2차, 신뢰 높음) — 구체적·최근 동향 언급은 면접 최강 신뢰 신호이며, 낡은 "최근"은 준비 부족을 드러냄. C2의 직접 근거. · UF Career Connections Center, "Four Steps for Researching an Employer" https://career.ufl.edu/four-steps-for-researching-an-employer/ · Ohio State ECS, "How to Research a Company for an Interview" https://www.ecs.osu.edu/news/2025/02/how-research-company-interview
- **CareerMate 내부 앵커(1차)** — 신선도 우려를 흩어진 채로 두지 않고 횡단 검증기로 승격한 근거: `salary-negotiation.md`(`evaluate_offer`의 `captured_at` 6개월 초과 시 **stale 플래그**·통화/지역 mismatch 규칙) → C1; `company-research.md` **R3**(최근뉴스 `dated` 6개월 이내, 12~18개월 초과 stale, 날짜 날조 금지) → C2·C5; `fit-matching.md` **R10**(분석 근거 `resumeVersionId`·`jobId` 기록으로 재분석 트리거) → C3·C4. · CareerMate `docs/career-os/knowledge/{salary-negotiation,company-research,fit-matching}.md`; `AGENTS.md`(추측 금지·확인 우선)

> 로케일 분기: **글로벌(테크)** 은 levels.fyi류 데이터에 `갱신 YYYY-Qn`이 붙어 신선도 추적이 쉽고 시장이 빠르므로 임계를 더 짧게(예: 3~6개월) 둘 수 있다. **한국**은 공채·자사양식 중심에 LinkedIn 침투가 낮아 외부 실시간 신호가 희소하고, 보상 참고치는 잡플래닛 연봉 제보·DART 사업보고서가 주된데 **DART는 연 1회 공시(전사 평균)** 라 본질적으로 최대 ~12개월 묵을 수 있다 → 한국 보상 데이터는 "수집일+공시 회계연도"를 함께 표기하고 6개월 임계를 *경고*로, 12개월을 *critical*로 적용한다(공시 주기 한계를 인정하되 stale를 숨기지 않음).

## 5. Phase B 힌트

- **MCP 도구 아이디어:**
  - `get_verifier({ id: "recency-staleness" })` — 이 루브릭(JSON: 항목·합격기준·det/ai 플래그·임계 개월수 파라미터·정규식 패턴·critical 등급)을 연결된 AI에게 그대로 serve.
  - `check_staleness({ artifact_id, now })` — det 항목을 CareerMate가 LLM 없이 계산: 저장된 benchmark `captured_at`, fact `dated`, `resumeVersionId`/JD 해시 vs 최신 버전을 `now`와 비교해 `{ stale_benchmarks[], stale_news[], version_drift: bool, undated_temporal_count, freshness_ratio }` 반환. 시점표현 정규식 카운트(C5)도 여기서 수행.
  - `get_freshness_anchors({ scope })` — 신선도 비교용 기준 집합 제공: `{ latest_resume_version_id, latest_jd_hashes[], benchmarks: [{..., captured_at}], credentials: [{name, expires_at}], timeline: [{role, start, end|null}], now }`. C1·C3·C4·C6·C7의 비교 대상으로 직접 사용.
- **데이터 형태 힌트:**
  - 모든 시점 민감 값에 `as_of`(YYYY-MM 또는 YYYY-Qn)와 `source_dated`를 1급 필드로 강제. benchmark는 `captured_at`(필수)+`region`+`currency`로 평탄화해 신선도/통화/지역을 한 번에 규칙 검증.
  - 산출물 메타에 `freshness: { ratio: 1.0, stale_count: 0, version: { resumeVersionId, jobId|jd_hash }, checked_at, as_of }`를 저장해 (a) `applied`/협상 단계 전환 전 통과 필수 게이팅, (b) 대시보드의 "근거 데이터가 낡음 → 재분석" 배지 표시, (c) 저장된 이력서·JD가 갱신되면 의존 산출물의 `version` 불일치를 감지해 **자동 재분석 큐**에 올리는 트리거로 활용.
  - 임계 개월수(news 6/12·benchmark 6/12)는 시장·로케일별 파라미터 테이블(`thresholds: { news_recent: 6, news_stale: 18, benchmark_warn: 6, benchmark_critical: 12 }`)로 외부화해 빠른 시장은 더 짧게 조정.
