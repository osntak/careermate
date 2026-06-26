---
_meta:
  asset: transferable-skill-adjacency
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: fit-analysis
  consumes: "eop/fit-analysis.md §0a·§3, fit-matching.md §2 원칙 3·R8·R9, eop/fit-analysis.md §5 탁월(가점)"
  sources:
    - "[2차] fit-matching.md §2 원칙 3 — gap 3단계 처리(partial 재분류·partialReason 강제·false-negative 방지)"
    - "[2차] fit-matching.md R8·R9 — partial 남용 방지·gap 과소평가 방지 루브릭"
    - "[2차] eop/fit-analysis.md §5 탁월(가점) — 'ATS가 놓치는 동의어/도구 등가 포착' 명시"
    - "[2차] eop/fit-analysis.md §3 — 전이가능 스킬 행동 증거 요건"
  note: "런타임 serve 배선은 K=5 게이트 전까지 미적용 — 참조 데이터. adjacency는 'partial'만 라이선스, 절대 'met' 아님. 증거는 사용자 이력서 불릿이 제공."
---

# 전이가능 스킬 인접성 + 도구 등가 사전 (Transferable Skill Adjacency)

> LLM이 gap → partial 재분류 판단과 ATS 동의어 포착에서 임의 발명 대신 이 사전을 조회한다.

## 사용 규칙 (binding)

- **adjacency는 'partial'만 라이선스한다. 절대 'met'이 아니다.** 이 사전의 인접성은 partial 재분류의 *근거*이며, full 충족 판정 근거가 아니다(fit-matching.md R8).
- **증거는 사용자 이력서 불릿이 제공한다.** 사전에 adjacency가 있어도 이력서에 행동 증거(불릿·지표·맥락)가 없으면 partial 불가, gap 유지(eop/fit-analysis.md §3 '전이가능 스킬은 행동 증거로만').
- **partialReason 강제.** partial로 재분류할 때는 '왜 full이 아닌지' 사유 1문장 필수(fit-matching.md R8). adjacency strength와 why를 활용해 작성한다.
- **tool_equivalence는 ATS 표면 존재 O/X 보고에 사용.** JD 키워드와 이력서 표현이 다를 때 동의어·별칭으로 연결해 표면 존재를 추가 탐지한다(fit-matching.md R7).
- **아래 시드 외 항목은 `[추정]` 표기.** 발명하지 마라.

## 도구 등가 (tool_equivalence) — ATS 표면 존재 보조

| canonical | aliases (ATS가 놓치는 표현) | 비고 |
|-----------|--------------------------|------|
| Adobe Creative Cloud | Adobe Creative Suite, CC, Photoshop/Illustrator suite | 버전명 혼용 빈번 |
| JavaScript | JS, ES6, ECMAScript | 표준 명칭 분리 |
| Google Analytics 4 | GA4, 구글 애널리틱스 | 한/영 혼용 |
| PostgreSQL | Postgres, psql | 축약 혼용 |
| CI/CD | 지속적 통합, Jenkins/GitHub Actions pipelines | 개념어·도구명 혼용 |

## 스킬 인접성 (adjacency) — partial 재분류 근거

| skill_a | skill_b | 방향 | strength | why (partialReason 작성 참고) |
|---------|---------|------|----------|-------------------------------|
| AWS | GCP | symmetric | moderate | 클라우드 개념·아키텍처 패턴 전이. 단, 관리형 서비스·운영툴은 vendor-specific 부분이 gap으로 남음. |
| A/B 테스트 | 실험 설계 | symmetric | strong | 동일 통계·가설검정 역량 기반. 도메인 적용 맥락만 다름. |
| PM | PO | symmetric | strong | 제품 방향·우선순위 결정 역할 중첩. 조직 구조에 따라 차이 존재. |
| React | Vue | symmetric | moderate | 컴포넌트 모델·상태관리 개념 전이. 생태계(라이브러리·관행)는 vendor-specific gap. |

## 머신 컴파일용 (Phase B)

```json
{
  "_meta": {
    "asset": "transferable-skill-adjacency",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "fit-analysis"
  },
  "inferenceRule": "adjacency는 partial 라이선스만. met 판정 불가. 행동 증거(이력서 불릿)가 없으면 gap 유지. partialReason 필수(fit-matching.md R8).",
  "tool_equivalence": [
    { "canonical": "Adobe Creative Cloud", "aliases": ["Adobe Creative Suite", "CC", "Photoshop/Illustrator suite"] },
    { "canonical": "JavaScript", "aliases": ["JS", "ES6", "ECMAScript"] },
    { "canonical": "Google Analytics 4", "aliases": ["GA4", "구글 애널리틱스"] },
    { "canonical": "PostgreSQL", "aliases": ["Postgres", "psql"] },
    { "canonical": "CI/CD", "aliases": ["지속적 통합", "Jenkins/GitHub Actions pipelines"] }
  ],
  "adjacency": [
    {
      "skill_a": "AWS",
      "skill_b": "GCP",
      "direction": "symmetric",
      "strength": "moderate",
      "why": "클라우드 개념·아키텍처 패턴 전이. 관리형 서비스·운영툴은 vendor-specific 부분이 gap으로 남음."
    },
    {
      "skill_a": "A/B 테스트",
      "skill_b": "실험 설계",
      "direction": "symmetric",
      "strength": "strong",
      "why": "동일 통계·가설검정 역량 기반. 도메인 적용 맥락만 다름."
    },
    {
      "skill_a": "PM",
      "skill_b": "PO",
      "direction": "symmetric",
      "strength": "strong",
      "why": "제품 방향·우선순위 결정 역할 중첩. 조직 구조에 따라 차이 존재."
    },
    {
      "skill_a": "React",
      "skill_b": "Vue",
      "direction": "symmetric",
      "strength": "moderate",
      "why": "컴포넌트 모델·상태관리 개념 전이. 생태계(라이브러리·관행)는 vendor-specific gap."
    }
  ]
}
```
