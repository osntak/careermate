---
_meta:
  asset: fit-self-check-rubric
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: fit-analysis
  consumes: "fit-matching.md §3 R1~R10, eop/fit-analysis.md §5"
  sources:
    - "[2차] fit-matching.md §3 — R1~R10 검증 루브릭 표 (count_expr·critical 플래그 verbatim)"
    - "[2차] eop/fit-analysis.md §5 — 즉시 FAIL 조건·PASS 조건 자가검증 루브릭"
  note: "런타임 serve 배선은 K=5 게이트 전까지 미적용 — 참조 데이터. 신규 내용 0 — fit-matching.md §3 + eop/fit-analysis.md §5를 구조화 JSON으로 패키징한 것."
---

# 적합도 분석 셀프체크 루브릭 (Fit Self-Check Rubric R1~R10)

> fit-matching.md §3과 eop/fit-analysis.md §5의 루브릭을 LLM이 조회 가능한 구조화 형태로 패키징. 신규 내용 없음.

## 사용 규칙 (binding)

- **이 루브릭은 패키징 자산이다.** 내용은 fit-matching.md §3과 eop/fit-analysis.md §5에서 verbatim 가져왔다. 해석 충돌 시 원본이 우선한다.
- **자가검증은 제출 전 전부 통과 확인.** critical=true 항목 하나라도 FAIL이면 출력 전 수정한다.
- **measure='det' 항목은 카운팅으로 검사.** measure='ai' 항목은 LLM 셀프체크 책임이며 서버가 보증하지 않는다.

## 데이터 (사람이 읽는 표)

| ID | 검사 항목 | 합격 기준 | measure | count_expr | critical |
|----|-----------|-----------|---------|------------|----------|
| R1 | 모든 요건에 [필수/우대] 라벨 + 복합 요건 분해 | 라벨 누락 0개; 쉼표·'및'·'and/or'로 묶인 줄이 개별 항목으로 분리됨 | det | 추출 항목 수를 세고 각 항목에 'must'/'nice' 토큰 존재 확인(누락==0). 원문 구분자 포함 줄 수 대비 분해 항목 수 ≥ 구분자+1 | false |
| R2 | 충족·부분충족 판정에 출처 ID + evidence 존재 | status가 met·partial인데 evidence[] 배열이 빈 항목 0개 | ai | met·partial 항목 수 대비 evidence.length>0 항목 수 비율 == 100% | true |
| R3 | quotedBullet/quotedMetric이 원문 substring (환각·수치변형 차단) | 인용 문자열이 해당 sourceId 입력 텍스트의 부분문자열이 아닌 항목 0개 | ai | 각 evidence의 quotedBullet을 입력 이력서/경력 텍스트에 대해 indexOf/includes 검색 → 미발견 개수 == 0 | true |
| R4 | gap 표기 + must-have 미충족마다 완화 전략 | 미충족 must 중 mitigation 문장이 없는 항목 0개 | det | 미충족 must 개수 == mitigation 문장 개수 비교 | false |
| R5 | must-have 충족률 수치 제시 + partial 제외 규칙 | 'met must 수 / 전체 must 수' 분수·% 1개 이상; 분자에 partial 미포함 | mixed | 분수/% 정규식(예: \d+/\d+, \d+%)이 must 문맥과 함께 1회 이상; 분자 == status=='met' 개수와 일치 확인 | false |
| R6 | critical·hardGate gap 시 '권장 불가' 병기 (게이트 단독 우선) | hardGate 또는 critical이 gap인데 verdict가 'recommend'인 사례 0개 | ai | requirements에 hardGate&&status==gap 또는 critical&&status==gap이 1개라도 있으면 verdict=='recommend' 금지 | true |
| R7 | 키워드 표면 존재가 의미 매칭과 분리 보고 | JD 핵심 키워드별 'O/X' 표기 1개 이상, 의미 매칭 충족 판정과 별도 필드 | det | 출력에 keywordSurfacePresent 또는 'O/X·있음/없음' 항목 카운트 ≥ 1 | false |
| R8 | partial 남용 방지 (사유 강제) | partial 항목 중 '왜 full이 아닌지' 사유 문장이 없는 항목 0개 | det | partial 항목 수 == partialReason 문장 수 비교 | false |
| R9 | gap 과소평가(false-negative) 방지 | gap으로 분류한 must마다 인접 증거 탐색 시도 흔적 존재 | ai | gap must 개수 대비 transferAttempt 표기(예: "인접 검토: …") 항목 수 == 100% | false |
| R10 | 신선도 추적 | 분석에 근거가 된 이력서 버전 ID·JD 식별자가 기록됨 | det | 출력/페이로드에 resumeVersionId·jobId(또는 JD 해시) 필드 존재 여부 == 있음 | false |

## 즉시 FAIL 조건 (eop/fit-analysis.md §5에서 verbatim)

- 증거 매핑 없는 키워드 카운트 fit%
- MUST·우대 미분리 또는 우대로 탈락
- 높은 커버리지 = 높은 적합 등치
- 증거 환각·미상 가정
- 학력·출신·나이·외모 등 금지 신호 사용
- 과적합 자동탈락·신입에 경력 녹아웃
- 요건별 증거 없는 인상·단일 직감 점수
- 종합 점수(정수) 누락(밴드만) 또는 점수↔밴드↔근거 불일치
- 판정영향 주장이 출처 span 미앵커(레벨·부재·운영속성 발명) 또는 기준일 없이 연차 산술(§0a 위반)

## 머신 컴파일용 (Phase B)

```json
{
  "_meta": {
    "asset": "fit-self-check-rubric",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "fit-analysis"
  },
  "checks": [
    {
      "id": "R1",
      "label": "모든 요건에 [필수/우대] 라벨 + 복합 요건 분해",
      "pass_when": "라벨 누락 0개; 복합 줄이 개별 항목으로 분리됨",
      "measure": "det",
      "count_expr": "추출 항목 수를 세고 각 항목에 'must'/'nice' 토큰 존재 확인(누락==0). 원문 구분자 포함 줄 수 대비 분해 항목 수 ≥ 구분자+1",
      "critical": false
    },
    {
      "id": "R2",
      "label": "충족·부분충족 판정에 출처 ID + evidence 존재",
      "pass_when": "status가 met·partial인데 evidence[] 배열이 빈 항목 0개",
      "measure": "ai",
      "count_expr": "met·partial 항목 수 대비 evidence.length>0 항목 수 비율 == 100%",
      "critical": true
    },
    {
      "id": "R3",
      "label": "quotedBullet/quotedMetric이 원문 substring (환각·수치변형 차단)",
      "pass_when": "인용 문자열이 해당 sourceId 입력 텍스트의 부분문자열이 아닌 항목 0개",
      "measure": "ai",
      "count_expr": "각 evidence의 quotedBullet을 입력 이력서/경력 텍스트에 indexOf/includes 검색 → 미발견 개수 == 0",
      "critical": true
    },
    {
      "id": "R4",
      "label": "gap 표기 + must-have 미충족마다 완화 전략",
      "pass_when": "미충족 must 중 mitigation 문장이 없는 항목 0개",
      "measure": "det",
      "count_expr": "미충족 must 개수 == mitigation 문장 개수 비교",
      "critical": false
    },
    {
      "id": "R5",
      "label": "must-have 충족률 수치 제시 + partial 제외 규칙",
      "pass_when": "'met must 수 / 전체 must 수' 분수·% 1개 이상; 분자에 partial 미포함",
      "measure": "mixed",
      "count_expr": "분수/% 정규식(\\d+/\\d+, \\d+%)이 must 문맥과 함께 1회 이상; 분자 == status=='met' 개수와 일치",
      "critical": false
    },
    {
      "id": "R6",
      "label": "critical·hardGate gap 시 '권장 불가' 병기 (게이트 단독 우선)",
      "pass_when": "hardGate 또는 critical이 gap인데 verdict가 'recommend'인 사례 0개",
      "measure": "ai",
      "count_expr": "requirements에 hardGate&&status==gap 또는 critical&&status==gap이 1개라도 있으면 verdict=='recommend' 금지",
      "critical": true
    },
    {
      "id": "R7",
      "label": "키워드 표면 존재가 의미 매칭과 분리 보고",
      "pass_when": "JD 핵심 키워드별 'O/X' 표기 1개 이상, 의미 매칭과 별도 필드",
      "measure": "det",
      "count_expr": "출력에 keywordSurfacePresent 또는 'O/X·있음/없음' 항목 카운트 ≥ 1",
      "critical": false
    },
    {
      "id": "R8",
      "label": "partial 남용 방지 (사유 강제)",
      "pass_when": "partial 항목 중 '왜 full이 아닌지' 사유 문장이 없는 항목 0개",
      "measure": "det",
      "count_expr": "partial 항목 수 == partialReason 문장 수 비교",
      "critical": false
    },
    {
      "id": "R9",
      "label": "gap 과소평가(false-negative) 방지",
      "pass_when": "gap으로 분류한 must마다 인접 증거 탐색 시도 흔적 존재",
      "measure": "ai",
      "count_expr": "gap must 개수 대비 transferAttempt 표기 항목 수 == 100%",
      "critical": false
    },
    {
      "id": "R10",
      "label": "신선도 추적",
      "pass_when": "분석에 근거가 된 이력서 버전 ID·JD 식별자가 기록됨",
      "measure": "det",
      "count_expr": "출력/페이로드에 resumeVersionId·jobId(또는 JD 해시) 필드 존재 여부 == 있음",
      "critical": false
    }
  ],
  "immediate_fail_conditions": [
    "증거 매핑 없는 키워드 카운트 fit%",
    "MUST·우대 미분리 또는 우대로 탈락",
    "높은 커버리지 = 높은 적합 등치",
    "증거 환각·미상 가정",
    "학력·출신·나이·외모 등 금지 신호 사용",
    "과적합 자동탈락·신입에 경력 녹아웃",
    "요건별 증거 없는 인상·단일 직감 점수",
    "종합 점수(정수) 누락(밴드만) 또는 점수↔밴드↔근거 불일치",
    "판정영향 주장이 출처 span 미앵커(레벨·부재·운영속성 발명) 또는 기준일 없이 연차 산술(§0a 위반)"
  ]
}
```
