---
_meta:
  asset: knockout-criteria-taxonomy
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: fit-analysis
  consumes: "eop/fit-analysis.md §0a·§2·§3, fit-matching.md §2 원칙 7, fit-matching.md R6"
  sources:
    - "[2차] eop/fit-analysis.md §2 — 녹아웃 선게이트·이진 판정·녹아웃 3~5개 제한·테스트 기준"
    - "[2차] eop/fit-analysis.md §0a — 발명차단·연차 기준일 규칙"
    - "[2차] eop/fit-analysis.md §3 — 한국 시장 특수(필수/우대·신입 금지·NCS·채용절차법)"
    - "[2차] fit-matching.md §2 원칙 7 — 하드 게이트 별도 식별·ATS knockout 인지"
    - "[2차] fit-matching.md R6 — critical/hardGate gap 시 '권장 불가' 게이트"
  note: "런타임 serve 배선은 K=5 게이트 전까지 미적용 — 참조 데이터. knockout 카테고리는 §0a 라벨규칙·채용절차법 가드 교차참조."
---

# 녹아웃 기준 분류 택소노미 (Knockout Criteria Taxonomy)

> LLM이 "이게 진짜 녹아웃인가?" 판단에서 일관성 없이 소프트 우대를 녹아웃으로 격상하지 않도록 이 택소노미를 조회한다.

## 사용 규칙 (binding)

- **녹아웃은 ~3~5개로 제한한다.** 테스트: "그게 없어도 탁월하면 뽑겠다"면 녹아웃 아님(eop/fit-analysis.md §2).
- **이진 판정: 충족/미충족/확인필요.** 'conditional' 카테고리는 binary_test 조건을 먼저 확인하고 판정.
- **'never' 카테고리를 녹아웃으로 격상 금지.** 도구·도메인 경험은 전이가능성(인접성 사전 참조)으로 평가한다.
- **한국 채용절차법 제4조의3 준수.** 학력·출신·나이·외모·가족 신호는 직무무관 정보 — 판정에 사용 금지(eop/fit-analysis.md §3).
- **연차 녹아웃에는 기준일이 있어야 한다.** 기준일 없으면 `[기준일 미제공 — 환산 불가]`로 두고 정성 비교만(eop/fit-analysis.md §0a).
- **신입 공고에 경력연수 녹아웃 적용 금지(eop/fit-analysis.md §3).**

## 데이터 (사람이 읽는 표)

| 카테고리 | is_hard_knockout | binary_test | 한국 예시 | 글로벌 예시 | 인플레이션 경고 |
|----------|-----------------|-------------|-----------|------------|----------------|
| 법적/규제 자격 | always | 없으면 직무가 법적으로 불가능한가 | 의사 면허, 변호사 자격, 전기기사 면허, 취업비자/체류자격 | PE license, bar admission, work authorization/visa | — |
| 필수 국가자격증 | conditional | JD가 명시 필수 + 직무 핵심인가 | 정보처리기사, TOEIC 기준점, 간호사 면허 | CPA, PMP (명시 필수 시) | 우대란에 있으면 가점이지 녹아웃 아님 |
| 근무지/온사이트 | conditional | 재배치/원격 협의 불가로 명시되었나 | 특정 지역 상주, 출장 가능 필수 | 특정 국가 상주 필수 | '상주 가능' 문구는 협의 가능성 확인 필요 |
| 경력 연수 (N년 이상) | conditional | 진짜 시니어 역할 + 기준일 제공됨 (§0a) | PM 5년 이상, 개발 3년 이상 | 5+ years in a senior role | 연차 인플레이션 — 신입 공고엔 적용 금지, 기준일 없으면 정성 비교만 |
| 특정 도메인/산업 경험 | never (default) | 대개 전이가능 → 리스크/면접확인 | 금융 도메인 경험 | healthcare domain exp | 도메인 미스매치는 감점 아닌 면접 확인 항목 |
| 특정 도구 핸즈온 | never | 동의어/등가도구로 전이 평가 (인접성 사전 참조) | AWS 운영 경험 | Salesforce hands-on | tool_equivalence·adjacency 사전 먼저 조회 |
| 학력/학위 | conditional | JD 명시 필수 + 직무 수행에 불가결한가 | 관련 학과 졸업 이상 | BS in CS required | 한국 블라인드·채용절차법 맥락: 직무무관 학력 신호 사용 금지 |

## 머신 컴파일용 (Phase B)

```json
{
  "_meta": {
    "asset": "knockout-criteria-taxonomy",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "fit-analysis"
  },
  "knockoutCap": 5,
  "knockoutTest": "그게 없어도 탁월하면 뽑겠다 → 녹아웃 아님(eop/fit-analysis.md §2)",
  "categories": [
    {
      "name": "법적/규제 자격",
      "is_hard_knockout": "always",
      "binary_test": "없으면 직무가 법적으로 불가능한가",
      "examples_ko": ["의사 면허", "변호사 자격", "전기기사 면허", "취업비자/체류자격"],
      "examples_global": ["PE license", "bar admission", "work authorization/visa"]
    },
    {
      "name": "필수 국가자격증",
      "is_hard_knockout": "conditional",
      "binary_test": "JD가 명시 필수 + 직무 핵심인가",
      "examples_ko": ["정보처리기사", "TOEIC 기준점", "간호사 면허"],
      "examples_global": ["CPA", "PMP (명시 필수 시)"],
      "inflation_warning": "우대란에 있으면 가점이지 녹아웃 아님"
    },
    {
      "name": "근무지/온사이트",
      "is_hard_knockout": "conditional",
      "binary_test": "재배치/원격 협의 불가로 명시되었나",
      "examples_ko": ["특정 지역 상주", "출장 가능 필수"],
      "examples_global": ["특정 국가 상주 필수"],
      "inflation_warning": "'상주 가능' 문구는 협의 가능성 확인 필요"
    },
    {
      "name": "경력 연수 (N년 이상)",
      "is_hard_knockout": "conditional",
      "binary_test": "진짜 시니어 역할 + 기준일 제공됨 (§0a)",
      "examples_ko": ["PM 5년 이상", "개발 3년 이상"],
      "examples_global": ["5+ years in a senior role"],
      "inflation_warning": "연차 인플레이션 — 신입 공고엔 적용 금지, 기준일 없으면 정성 비교만"
    },
    {
      "name": "특정 도메인/산업 경험",
      "is_hard_knockout": "never",
      "binary_test": "대개 전이가능 → 리스크/면접확인",
      "examples_ko": ["금융 도메인 경험"],
      "examples_global": ["healthcare domain exp"],
      "inflation_warning": "도메인 미스매치는 감점 아닌 면접 확인 항목"
    },
    {
      "name": "특정 도구 핸즈온",
      "is_hard_knockout": "never",
      "binary_test": "동의어/등가도구로 전이 평가 (transferable-skill-adjacency 사전 참조)",
      "examples_ko": ["AWS 운영 경험"],
      "examples_global": ["Salesforce hands-on"],
      "inflation_warning": "tool_equivalence·adjacency 사전 먼저 조회"
    },
    {
      "name": "학력/학위",
      "is_hard_knockout": "conditional",
      "binary_test": "JD 명시 필수 + 직무 수행에 불가결한가",
      "examples_ko": ["관련 학과 졸업 이상"],
      "examples_global": ["BS in CS required"],
      "inflation_warning": "한국 블라인드·채용절차법 맥락: 직무무관 학력 신호 사용 금지(eop/fit-analysis.md §3)"
    }
  ]
}
```
