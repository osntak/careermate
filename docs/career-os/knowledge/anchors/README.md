# anchors/ — 앵커데이터 자산

구조화 데이터(룩업 사전·택소노미·질문은행·루브릭)를 둔다. 목적은 단 하나 — **LLM이 매 실행마다 재발명하던 값을 "조회"하게 해 환각·불일치를 줄인다.** 산문 지침이 아니다. 새 원칙·EOP 변경은 여기 두지 않는다(검증 루프 R7~R15: 지침 양↑ ≠ 품질↑).

## 규약

- 각 파일은 YAML 프런트매터 `_meta{ asset, version, sourceDate, status:advisory, domain, consumes, sources, note }` 를 갖는다.
- 의미 판단 필드(의도·anti-pattern·시니어리티 tier 등)는 `ai-judge`(연결 AI 위임)로 표기한다. 결정론 조회 값(count_mode·동의어·enum 등)만 lint로 검사 가능하다.
- 출처는 가능하면 해당 도메인 `.md`에 **이미 인용된** 출처만 쓴다. 신규 sourcing은 **[1차] 공식만** 허용.

## serve 배선은 게이트다

- 이 폴더에 **파일을 추가하는 것 자체**는 런타임에 영향이 없다(고정 `EXPERT_DOMAINS` 밖 — 빌드·typecheck·serve 무영향). 순수 가산.
- 그러나 `get_playbook`/`get_verifier`/EOP가 이 데이터를 **실제로 주입·소비**하게 묶는 변경은 LLM 추론 경로를 바꾸는 load-bearing 변경이다 → `validation/PROTOCOL.md` §10의 **K=5 A/B 검증 후에만** 적용한다.

근거·계획: [`validation/research/2026-06_knowledge-enrichment.md`](../../validation/research/2026-06_knowledge-enrichment.md)
