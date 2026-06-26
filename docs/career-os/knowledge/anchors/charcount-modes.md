---
_meta:
  asset: charcount-modes
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: cover-letter
  consumes: "cover-letter.md R9, eop/cover-letter.md §1"
  sources:
    - "[참고] jobkorea textcount 기능 설명 — 잡코리아 글자수 계산기 실측 기준 (cover-letter.md R9 인용)"
    - "[참고] HAIJOB 글자수 가이드 — 플랫폼별 공백포함/제외 기준 안내 (cover-letter.md R9 인용)"
  note: "런타임 serve 배선은 K=5 게이트 전까지 미적용 — 참조 데이터. 의도 라벨·anti_pattern 필드는 ai-judge."
---

# 글자수 카운트 모드 룩업

> 목적 1줄: LLM이 R9/C6 글자수 게이트를 적용하기 전에 플랫폼별 count_mode를 매 실행 추측하지 않고 조회하도록.

## 사용 규칙 (binding)

- `count_mode` 미지정(공고·문항에 명시 없음) 시 **fail-safe = byte** 로 가정하고 사용자에게 1회 확인한다 — 가장 빡빡한 기준으로 초안을 맞추면 어떤 기준에도 안전하다.
- 잡코리아(`jobkorea`)는 플랫폼 자체 글자수 계산기(`textcount`)로 **실측**한다 — 이 표의 기본값을 그대로 적용하지 말고 도구로 확인한다.
- `byte` 모드에서 한글 1자의 바이트 수는 인코딩에 따라 다르다: EUC-KR 2 byte, UTF-8 3 byte — 공고가 인코딩을 명시하지 않으면 **EUC-KR 2 byte** 를 보수적 기본값으로 사용한다.
- 영문 단일 레터(`en-letter`)는 글자수가 아닌 **단어 수(word count)** 기준이다.
- 이 표에 없는 플랫폼·자사양식은 `자사양식(미지정)` 행을 기본값으로 적용한다.

## 데이터 (사람이 읽는 표)

| platform / context | default_count_mode | byte_per_hangul | notes |
|---|---|---|---|
| 자사양식 (미지정) | `with_space` | — | 안전 기본값. 공백 포함이 가장 관대한 기준이므로 이 수치로 맞추면 다른 기준에서 더 짧아질 수 있음 — fail-safe는 byte |
| 공공기관·일부 포털 byte 제한 | `byte` | EUC-KR 2 / UTF-8 3 | 공고에 "byte" 또는 "바이트" 명시 시 적용. 인코딩 불명이면 EUC-KR 2 byte로 계산 |
| 잡코리아 (jobkorea) | 실측 필요 | — | 플랫폼 글자수 계산기(`textcount` 도구)로 직접 측정. 이 표 기본값 대신 실측값 사용 |
| 영문 단일 레터 (en-letter) | `word_count` | — | 250~400 단어 권장, 400단어 상한. 글자수 아닌 단어 수 기준 |

## 머신 컴파일용 (Phase B)

```json
{
  "_meta": {
    "asset": "charcount-modes",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "cover-letter"
  },
  "failsafe_default": "byte",
  "failsafe_note": "count_mode 미지정 시 byte 가정 후 사용자에게 1회 확인",
  "rows": [
    {
      "platform": "자사양식(미지정)",
      "default_count_mode": "with_space",
      "byte_per_hangul": null,
      "notes": "안전 기본값. fail-safe는 byte"
    },
    {
      "platform": "공공기관·일부포털 byte제한",
      "default_count_mode": "byte",
      "byte_per_hangul": { "euc_kr": 2, "utf8": 3, "default_if_unknown": 2 },
      "notes": "공고에 byte/바이트 명시 시 적용. 인코딩 불명이면 EUC-KR 2 byte"
    },
    {
      "platform": "jobkorea",
      "default_count_mode": "measure_required",
      "byte_per_hangul": null,
      "notes": "플랫폼 textcount 도구로 실측 — 표 기본값 대신 실측값 사용"
    },
    {
      "platform": "en-letter",
      "default_count_mode": "word_count",
      "byte_per_hangul": null,
      "notes": "250~400단어 권장, 400단어 상한"
    }
  ]
}
```
