---
_meta:
  asset: kr-question-directives
  version: 1
  sourceDate: 2026-06-26
  status: advisory
  domain: cover-letter
  consumes: "cover-letter.md R4·R9, responsiveness-on-target C2, eop/cover-letter.md §1·§2-2"
  sources:
    - "[참고] jasoseol.com 문항의도 가이드 — 문항 유형별 숨은 평가의도 (cover-letter.md §5 Phase B 힌트, EOP §2-2 인용)"
    - "[참고] HAIJOB 항목별 자소서 작성 가이드 — 지원동기·성장과정·직무역량·입사후포부·약점 항목 (cover-letter.md 인용)"
    - "[1차/기조] 광주 서구 일자리센터 — NCS 기반 자소서 문항 분류 (cover-letter.md R11 근거)"
  note: "런타임 serve 배선은 K=5 게이트 전까지 미적용 — 참조 데이터. 의도 라벨(hidden_intent)·anti_pattern 필드는 ai-judge."
---

# KR 정형 문항 디렉티브 뱅크

> 목적 1줄: LLM이 한국 자소서 문항의 숨은 평가의도를 매 실행 재발명하지 않고 조회하도록.

## 사용 규칙 (binding)

- `R4_quant_exempt: true`인 문항(약점·성장과정·입사후포부)은 cover-letter.md R4의 "정량 성과 ≥1" 게이트에서 **면제**한다 — 이 문항에 숫자 부재를 이유로 fail 처리하지 마라.
- `hidden_intent` 라벨은 ai-judge — LLM이 의미 판단으로 확인한다.
- `required_directives` 순서는 두괄식(결론 선행) 원칙과 결합한다: 첫 번째 디렉티브가 도입 두괄식을 구성한다.
- `anti_pattern`은 가장 흔한 동문서답 패턴이다 — 작성 전과 검증 시 모두 확인한다.
- 문항 표면 문구가 `aliases`에 없어도 의미가 일치하면 해당 행을 적용한다.
- 이 뱅크에 없는 문항 유형은 `question_type: unknown`으로 처리하고 LLM이 공고 맥락으로 추론한다.

## 데이터 (사람이 읽는 표)

| question_type | aliases | hidden_intent | required_directives | length_default (자) | star_weight_hint | R4_quant_exempt | anti_pattern |
|---|---|---|---|---|---|---|---|
| 지원동기 | 지원 동기, 입사 지원 사유, 왜 우리 회사 | 여기 오게 한 구체 경험·접점(표면 관심 아님) | 1) 계기 경험(구체 에피소드), 2) 회사 고유 연결(미션·제품·인재상), 3) 직무 적합(내 강점↔직무 요건) | 500~700 | S20·T10·A50·R20 | false | 회사 칭찬·제품 일반론으로 채움 / 회사명만 바꾸면 되는 제너릭 |
| 성장과정 | 성장 배경, 가치관 형성 | 동기의 근원+현재 직무로의 서사 연결(인생 연대기 아님) | 1) 형성 사건 1개(구체 계기), 2) 가치·태도 도출, 3) 직무 연결 | 500~700 | S30·T10·A40·R20 | true | 유년기부터 시간순 나열 / 인생 전기 형식 |
| 직무역량 | 직무 역량, 직무 경험, 본인의 강점, 핵심 역량 | 역할 핵심역량 1~2개 정확 식별+STAR 증명 | 1) 역량 명시(두괄식), 2) STAR 증명(행동+결과 델타), 3) 직무 전이 한 문장 | 600~800 | S15·T10·A60·R15 | false | 5~6개 역량 얕게 나열 / 역량 이름만 나열하고 증거 없음 |
| 입사후포부 | 포부, 입사 후 계획, 입사 후 목표 | 회사 사업방향에 묶인 단·중·장기(과대 금지) | 1) 단기 역량 계획(1~2년), 2) 중기 기여(3~5년, 팀·프로젝트 단위), 3) 장기 포지셔닝(사업방향 연계) | 400~600 | — | true | "5년 안에 임원" 식 과대 / 사업방향과 무관한 개인 목표 |
| 약점·실패·갈등 | 단점, 실패 경험, 갈등 해결, 어려운 상황, 단점과 극복 | 진짜 약점+구체 개선행동+바뀐 결과(정성 허용) | 1) 진짜 약점·실패 명시(험블브래그 금지), 2) 구체 개선 행동, 3) 변화(결과 델타 또는 정성 성찰) | 400~600 | — | true | 험블브래그("완벽주의가 단점") / 개선 없는 변명 / 약점을 강점으로 포장만 |

## 머신 컴파일용 (Phase B)

```json
{
  "_meta": {
    "asset": "kr-question-directives",
    "version": 1,
    "sourceDate": "2026-06-26",
    "status": "advisory",
    "domain": "cover-letter"
  },
  "rows": [
    {
      "question_type": "지원동기",
      "aliases": ["지원 동기", "입사 지원 사유", "왜 우리 회사"],
      "hidden_intent": "여기 오게 한 구체 경험·접점(표면 관심 아님)",
      "required_directives": ["계기 경험", "회사 고유 연결", "직무 적합"],
      "length_default": "500~700",
      "star_weight_hint": "S20·T10·A50·R20",
      "R4_quant_exempt": false,
      "anti_pattern": "회사 칭찬·제품 일반론으로 채움 / 회사명만 바꾸면 되는 제너릭"
    },
    {
      "question_type": "성장과정",
      "aliases": ["성장 배경", "가치관 형성"],
      "hidden_intent": "동기의 근원+현재 직무로의 서사 연결(인생 연대기 아님)",
      "required_directives": ["형성 사건 1개", "가치·태도 도출", "직무 연결"],
      "length_default": "500~700",
      "star_weight_hint": "S30·T10·A40·R20",
      "R4_quant_exempt": true,
      "anti_pattern": "유년기부터 시간순 나열 / 인생 전기 형식"
    },
    {
      "question_type": "직무역량",
      "aliases": ["직무 역량", "직무 경험", "본인의 강점", "핵심 역량"],
      "hidden_intent": "역할 핵심역량 1~2개 정확 식별+STAR 증명",
      "required_directives": ["역량 명시", "STAR 증명", "직무 전이"],
      "length_default": "600~800",
      "star_weight_hint": "S15·T10·A60·R15",
      "R4_quant_exempt": false,
      "anti_pattern": "5~6개 역량 얕게 나열 / 역량 이름만 나열하고 증거 없음"
    },
    {
      "question_type": "입사후포부",
      "aliases": ["포부", "입사 후 계획", "입사 후 목표"],
      "hidden_intent": "회사 사업방향에 묶인 단·중·장기(과대 금지)",
      "required_directives": ["단기 역량 계획", "중기 기여", "장기 포지셔닝"],
      "length_default": "400~600",
      "star_weight_hint": null,
      "R4_quant_exempt": true,
      "anti_pattern": "\"5년 안에 임원\" 식 과대 / 사업방향과 무관한 개인 목표"
    },
    {
      "question_type": "약점·실패·갈등",
      "aliases": ["단점", "실패 경험", "갈등 해결", "어려운 상황", "단점과 극복"],
      "hidden_intent": "진짜 약점+구체 개선행동+바뀐 결과(정성 허용)",
      "required_directives": ["진짜 약점·실패 명시", "구체 개선 행동", "변화(델타 또는 정성)"],
      "length_default": "400~600",
      "star_weight_hint": null,
      "R4_quant_exempt": true,
      "anti_pattern": "험블브래그(완벽주의) / 개선 없는 변명 / 약점을 강점으로 포장만"
    }
  ]
}
```
