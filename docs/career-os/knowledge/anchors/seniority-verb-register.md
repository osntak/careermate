---
_meta:
  asset: seniority-verb-register
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: fit-analysis
  consumes: "eop/fit-analysis.md §0a·§3, fit-matching.md §2 원칙 5"
  sources:
    - "[2차] eop/fit-analysis.md §3 — 동사 레지스터 레벨 추론 3티어 목록(신입·mid·senior) 직접 출처"
    - "[2차] fit-matching.md §2 원칙 5 — 오버퀄/스코프 미스매치 리스크 원칙"
  note: "런타임 serve 배선은 K=5 게이트 전까지 미적용 — 참조 데이터. eop/fit-analysis.md §3 동사 레지스터 추론의 lookup 근거."
---

# 시니어리티 동사 레지스터 사전 (Seniority Verb Register)

> LLM이 이력서 동사에서 레벨을 추론할 때 임의 발명 대신 이 사전을 조회한다. 동사 티어는 SIGNAL이며 hard knockout이 아니다.

## 사용 규칙 (binding)

- **동사 티어는 SIGNAL이지 판정이 아니다.** 티어 추론 결과는 반드시 `[추정 — 출처에 없음]` 라벨로 표기한다(eop/fit-analysis.md §0a 발명차단 규칙).
- **직함과 교차확인 필수.** 동사만으로 레벨을 단정하지 말고, JD 직함·경력 직함과 교차확인해 스코프 미스매치를 탐지한다(eop/fit-analysis.md §3).
- **scope_mismatch는 감점이 아니라 면접 확인 항목이다.** 미스매치가 감지되어도 hard knockout으로 격상하지 마라(fit-matching.md §2 원칙 5 오버퀄/방향 불일치는 리스크+완화질문).
- **아래 목록 외 동사는 `[추정]` 표기.** 시드를 넘어 발명하지 마라.

## 데이터 (사람이 읽는 표)

| 티어 | 한국어 동사 (ko_verbs) | 영어 동사 (en_verbs) | scope_signal |
|------|----------------------|--------------------|----|
| **entry / junior** | 지원, 수행, 참여, 보조, 작성, 학습, 숙지 | assisted, supported, contributed, learned, participated | 개인 과제·지원 역할. 방향 지시 없이 실행. |
| **mid** | 운영, 분석, 기획, 관리, 개선, 구현, 담당 | built, implemented, managed, analyzed, owned (single-scope) | 단일 스코프 오너십. 팀 내 독립 실행. |
| **senior** | 전략 수립, 리드, 의사결정, 설계 총괄, 정의, 표준화 | led, drove, architected, defined, owned (cross-team), established | 크로스팀 영향력. 방향 설정 및 기준 수립. |
| **lead / exec** | 총괄, 주도, 방향 설정, 조직, 채용, 멘토링 | directed, headed, scaled, set vision, hired, mentored | 조직 단위 책임. 인재 확보·육성 포함. |

## scope_mismatch 규칙

| 패턴 | 플래그 |
|------|--------|
| 이력서 동사 최고 티어 ≤ mid, JD 직함 = Lead / Principal / 팀장 이상 | `[추정] 스코프 미스매치 — 리드 행동 증거 부재, 면접 확인 항목` |
| 이력서 동사 최고 티어 ≥ senior, JD = 신입/주니어 공고 | `[추정] 오버퀄 가능성 — 리스크 및 완화질문 항목` |

## 머신 컴파일용 (Phase B)

```json
{
  "_meta": {
    "asset": "seniority-verb-register",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "fit-analysis"
  },
  "locale": "ko+en",
  "tiers": [
    {
      "level": "entry",
      "ko_verbs": ["지원", "수행", "참여", "보조", "작성", "학습", "숙지"],
      "en_verbs": ["assisted", "supported", "contributed", "learned", "participated"],
      "scope_signal": "개인 과제·지원 역할. 방향 지시 없이 실행."
    },
    {
      "level": "mid",
      "ko_verbs": ["운영", "분석", "기획", "관리", "개선", "구현", "담당"],
      "en_verbs": ["built", "implemented", "managed", "analyzed", "owned (single-scope)"],
      "scope_signal": "단일 스코프 오너십. 팀 내 독립 실행."
    },
    {
      "level": "senior",
      "ko_verbs": ["전략 수립", "리드", "의사결정", "설계 총괄", "정의", "표준화"],
      "en_verbs": ["led", "drove", "architected", "defined", "owned (cross-team)", "established"],
      "scope_signal": "크로스팀 영향력. 방향 설정 및 기준 수립."
    },
    {
      "level": "lead",
      "ko_verbs": ["총괄", "주도", "방향 설정", "조직", "채용", "멘토링"],
      "en_verbs": ["directed", "headed", "scaled", "set vision", "hired", "mentored"],
      "scope_signal": "조직 단위 책임. 인재 확보·육성 포함."
    }
  ],
  "scope_mismatch_rules": [
    {
      "pattern": "resume verbs cap at mid-tier but JD title = Lead/Principal/팀장 이상",
      "flag": "[추정] 스코프 미스매치 — 리드 행동 증거 부재, 면접 확인 항목"
    },
    {
      "pattern": "resume verbs at senior+ tier but JD = 신입/주니어 공고",
      "flag": "[추정] 오버퀄 가능성 — 리스크 및 완화질문 항목"
    }
  ],
  "inferenceRule": "동사 티어는 SIGNAL. 단정 금지. 결과는 반드시 [추정 — 출처에 없음] 라벨 표기(eop/fit-analysis.md §0a)."
}
```
