---
_meta:
  asset: competency-enum
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: interview
  consumes: "interview-behavioral.md §3 태깅·R7/R11, eop/interview-prep.md §0.1.1, save_interview_prep distinct-count 검증"
  sources:
    - "[1차] interview-behavioral.md §3 (원본 인라인 enum — 단일화 대상)"
  note: "신규 내용 0 — 인라인 리스트의 단일 원본화. companyValueTag는 반드시 enum id 1개에 연결."
---

# 역량 controlled vocabulary (단일 원본)

> 목적: 세 문서(EOP·behavioral·technical)가 각자 재진술하던 12개 역량 enum을 단일 원본으로. 태그 인플레이션(R7/R11) 방지 + distinct-count 결정론 검증.

## 사용 규칙 (binding)
- competencyEnum은 **닫힌 집합**(12개). 새 역량 추가 금지(태그 인플레이션 차단).
- companyValueTag 형식 = `Company:Value` 이며 반드시 enum id 1개에 매핑.

## 데이터 (표)

| id | ko_label | en_label | probeHint |
|----|----------|----------|-----------|
| leadership | 리더십 | leadership | 팀/방향 결정을 주도한 구체 사례, 지시가 없어도 방향을 잡은 순간 |
| ownership | 오너십 | ownership | 내 역할 밖에서 끝까지 책임진 사례, 온콜이 아닌데 나선 이유 |
| conflict | 갈등 해결 | conflict | 의견 충돌 해소 방식, 협상·설득 과정에서 본인이 양보하거나 관철한 근거 |
| failure-learning | 실패·성장 | failure-learning (=growth-learning) | 실패를 어떻게 발견했나, 재발 방지 행동이 무엇인가 |
| initiative | 주도적 실행 | initiative | 시키지 않았는데 시작한 이유, 첫 단계로 무엇을 했나 |
| data-driven | 데이터 기반 판단 | data-driven | 어떤 데이터로 결정했나, 데이터가 없었으면 어떻게 했을 것인가 |
| customer-focus | 고객 중심 | customer-focus | 고객 임팩트를 어떻게 측정했나, 내부 효율 vs 고객 가치 트레이드오프 |
| collaboration | 협업 | collaboration | 이해관계자와 의견을 맞춘 방식, 가장 어려웠던 협업 상대 |
| deadline-pressure | 마감 압박 대응 | deadline-pressure | 우선순위 결정 기준, 잘라낸 범위와 그 근거 |
| ambiguity | 모호함 처리 | ambiguity | 가정을 어떻게 명시했나, 첫 번째 확인 대상과 이유 |
| influence | 영향력·설득 | influence | 권한 없이 설득한 방법, 상대가 반대했을 때 다음 단계 |
| mentoring | 멘토링·코칭 | mentoring | 어떻게 성장을 확인했나, 멘티가 막혔을 때 개입 방식 |

## 머신 컴파일용

```json
{
  "_meta": {
    "asset": "competency-enum",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "interview"
  },
  "competencyEnum": [
    { "id": "leadership",        "ko_label": "리더십",          "en_label": "leadership",                    "probeHint": "팀/방향 결정을 주도한 구체 사례, 지시가 없어도 방향을 잡은 순간" },
    { "id": "ownership",         "ko_label": "오너십",          "en_label": "ownership",                     "probeHint": "내 역할 밖에서 끝까지 책임진 사례, 온콜이 아닌데 나선 이유" },
    { "id": "conflict",          "ko_label": "갈등 해결",       "en_label": "conflict",                      "probeHint": "의견 충돌 해소 방식, 협상·설득 과정에서 본인이 양보하거나 관철한 근거" },
    { "id": "failure-learning",  "ko_label": "실패·성장",       "en_label": "failure-learning (=growth-learning)", "probeHint": "실패를 어떻게 발견했나, 재발 방지 행동이 무엇인가" },
    { "id": "initiative",        "ko_label": "주도적 실행",     "en_label": "initiative",                    "probeHint": "시키지 않았는데 시작한 이유, 첫 단계로 무엇을 했나" },
    { "id": "data-driven",       "ko_label": "데이터 기반 판단","en_label": "data-driven",                   "probeHint": "어떤 데이터로 결정했나, 데이터가 없었으면 어떻게 했을 것인가" },
    { "id": "customer-focus",    "ko_label": "고객 중심",       "en_label": "customer-focus",                "probeHint": "고객 임팩트를 어떻게 측정했나, 내부 효율 vs 고객 가치 트레이드오프" },
    { "id": "collaboration",     "ko_label": "협업",            "en_label": "collaboration",                 "probeHint": "이해관계자와 의견을 맞춘 방식, 가장 어려웠던 협업 상대" },
    { "id": "deadline-pressure", "ko_label": "마감 압박 대응",  "en_label": "deadline-pressure",             "probeHint": "우선순위 결정 기준, 잘라낸 범위와 그 근거" },
    { "id": "ambiguity",         "ko_label": "모호함 처리",     "en_label": "ambiguity",                     "probeHint": "가정을 어떻게 명시했나, 첫 번째 확인 대상과 이유" },
    { "id": "influence",         "ko_label": "영향력·설득",     "en_label": "influence",                     "probeHint": "권한 없이 설득한 방법, 상대가 반대했을 때 다음 단계" },
    { "id": "mentoring",         "ko_label": "멘토링·코칭",     "en_label": "mentoring",                     "probeHint": "어떻게 성장을 확인했나, 멘티가 막혔을 때 개입 방식" }
  ],
  "companyValueTagFormat": "Company:Value (must link to one enum id)"
}
```
