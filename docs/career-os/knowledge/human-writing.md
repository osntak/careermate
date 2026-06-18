# 사람처럼 쓰기 (anti-AI-slop) / Human Writing — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

커리어 문서(자기소개서·자기 PR·지원 메일·면접 답변)를 "AI가 쓴 티" 없이, 사용자 고유의 목소리로, 사실을 보존하며 쓰도록 연결된 AI를 안내한다. CareerMate의 **1차 사용자층은 한국어 자소서 작성자**이므로 이 플레이북은 한국어 슬롭(번역투·클리셰·기계적 병렬·수동태)을 1차 기준으로, 영어 마커는 영문 지원서일 때만 적용하는 **보조 기준**으로 둔다. 이 문서는 기존 `packages/prompts/src/humanize.ts`의 정성 가이드(한국어 8개 항목, `epoko77-ai/im-not-ai` 근거)를 **상위 단일 원본으로 흡수·확장**하고, 거기에 "LLM 없이 셀 수 있는" 결정론 루브릭과 채용 적합성 축을 더한 것이다. 핵심은 슬롭 제거가 아니라 **"거짓 없고 직무에 맞닿은, 사람 목소리의 글"**을 만드는 것이다 — 슬롭이 0이어도 동문서답·내용 공백이면 떨어진다.

## 2. 플레이북

### 원칙

- **(한국어 슬롭을 1차로 거른다)** 번역투("~에 대한/~을 통해/~에 있어서/~라는 점에서/가지고 있습니다/~을 진행하였습니다"), 클리셰("급변하는 시대/4차 산업혁명/끊임없는 노력/귀사의 발전에 기여/소통과 협업/성장하는 인재"), 정의문 반복("저는 ~한 사람입니다"의 남발), 수동태("~되어졌습니다"), 형식 과용(가운뎃점 `·` 남발, 불필요한 굵게/이모지, "첫째·둘째·셋째")을 제거한다 — 이것이 한국 채용 담당자가 실제로 거르는 진짜 슬롭이다. _(출처: humanize.ts / epoko77-ai/im-not-ai)_
- **(영어 과잉어휘는 영문 지원서에서만 보조로 차단)** delve, leverage, utilize, showcase, underscore, harness, bolster, illuminate, facilitate, intricate, meticulous, tapestry, realm, beacon, testament, foster, robust 등은 같은 의미의 일상어로 치환한다(leverage→use, utilize→use, delve into→examine). 단 단어 경계(`\b`)로 매칭하고 정당한 기술 맥락(`robust error handling`, UI `navigate`, `foster care`)은 예외로 둔다. **locale='ko'에서는 이 사전의 가중치를 낮춘다.** _(출처: Kobak et al. 2024; The Conversation 2025 — 단, "단일 지표 맹신은 과학보다 art"라는 원문 경고를 함께 적용)_
- **(증거로 보여준다, Show don't tell)** 열정 선언("열정을 가지고/최선을 다하겠습니다/빨리 배웁니다/I am excited to/I want to/fast learner/great fit")과 추상 성격 나열("성실·책임감·소통능력")은 **무엇을 했고 그 결과 수치가 어떻게 됐다**는 구체 사실로 대체한다. _(출처: TopResume; The Muse; Univ. of Michigan Career Center; humanize.ts 7항)_
- **(사실을 잠근다, Fact lock)** 숫자·고유명사·날짜·직함·회사명·기술스택은 사용자가 준 그대로 보존한다. **단, 입력 사실로부터의 명시적 파생연산(차·합·비율 환산: 월12건→월2건에서 "83% 감소")은 허용**한다. 모르면 지어내지 말고 `[확인 필요]`로 표시한다. 이 체크는 한국어 NER 한계 때문에 **결정론 게이트가 아니라 LLM 보조 플래그**로 둔다(아래 R7). _(출처: CareerMate AGENTS.md 프라임 디렉티브)_
- **(직무 적합성을 1차 게이트로)** 주장 1개당 **그 JD의 요구 역량과 매칭되는** 검증 가능한 사실 1개를 붙인다. `get_application_context`의 `matched_keywords`/`missing_keywords`와 산출물을 대조해, 슬롭은 없지만 동문서답인 글을 거른다. _(출처: 채용 매니저 리뷰 — job-fit 축; CareerMate get_application_context)_
- **(목소리 보존)** 사용자 원문·이력서를 샘플로 평균 문장길이·어휘 수준을 맞추고, 표준 코퍼레이트 톤으로 평탄화하지 않는다. 이는 분포 유사도로 측정 가능하다(R8). _(출처: The Augmented Educator; humanize.ts; get_writing_style_guide)_
- **(간결성, Omit needless words)** 형용사·부사로 부풀리지 않고, 초안 후 "불필요한 단어 삭제" 패스를 1회 더 돌린다. 능동태를 기본으로 한다. _(출처: Strunk & White)_
- **(두괄식 + STAR)** 각 문항 첫 문장에 그 문항의 핵심 결론을 두고, 본문은 상황(S)·과제(T)·행동(A)·결과(R)로 전개한다. **한국어에서 "저는 ~입니다"로 시작하는 두괄식 대표문장은 정석이므로 슬롭으로 취급하지 않는다.** _(출처: 링커리어/하이잡/대웅 STAR 가이드)_

### Do

- 문항/문단 첫 문장에 핵심 결론을 둔다(두괄식). "저는 데이터로 문제를 정의하는 사람입니다" 같은 대표문장은 권장된다.
- 주장 1개당 **그 JD 요구역량에 맞닿은** 검증 가능한 사실(수치·기간·도구·역할·결과)을 최소 1개 붙인다.
- `matched_keywords`를 산출물이 증거와 함께 다루는지 확인한다(키워드 커버리지).
- 능동태·단문 위주로 쓰되 문장 길이를 변주한다(짧은 문장과 긴 문장 섞기). 단 이는 신호일 뿐 목표가 아니다 — 가독성 우선.
- 공고/플랫폼의 글자수 상한(예: 500자/1000자)을 지킨다. 초과는 시스템에서 잘린다.
- 사용자 원문·이력서의 어조·어휘 수준을 샘플로 삼아 목소리를 맞춘다.
- 숫자·고유명사·날짜·회사명을 원본과 대조하되, 콤마/단위/한글수사 차이(1,200ms=1200ms, 12만=120,000)는 같은 값으로 정규화한다.
- 입력 사실에서 파생한 환산값(차·합·비율)은 계산해 써도 된다.
- 초안 후 "불필요한 단어 삭제" 패스를 1회 더 돌린다.
- 불확실한 사실은 `[확인 필요]`로 표시하고 사용자에게 되묻는다.

### Don't

- 번역투("~에 대한/~을 통해/가지고 있습니다")와 클리셰("급변하는 시대/4차 산업혁명/귀사의 발전에 기여")로 문장을 채우지 않는다.
- "성실·책임감·소통능력" 같은 추상 형용사를 사례 없이 나열하지 않는다.
- "열정을 가지고/최선을 다하겠습니다/밑거름이 되겠습니다/I am excited to/I want to(공허한 자기선언)"로 채우지 않는다.
- **회사명 오기재**(타 회사 자소서 복붙)를 하지 않는다 — fact-lock보다 흔하고 치명적이다.
- **문항 질문에 답하지 않는 동문서답**을 하지 않는다.
- 가운뎃점(`·`) 남발, 불필요한 굵게/이모지, 과한 마크다운, em-dash 남발을 하지 않는다.
- "A, B, and C / A하고 B하며 C하는" 삼단열거를 **기계적으로** 반복하지 않는다(정상적 명사 3항 나열 "디자인·개발·운영"은 허용).
- "it's important to note/물론 ~지만/전반적으로/어떻게 보면" 헤징·메타 코멘트를 넣지 않는다.
- **출처 없는 정성 우월 주장**("팀 사기를 크게 높였다/탁월한/대폭 개선")을 쓰지 않는다 — 숫자가 없어 fact-lock에도 안 걸리지만 면접에서 깨진다.
- 사용자가 주지 않은 수치·수상·직함을 추정·미화·반올림하지 않는다(파생 환산은 예외).
- 사용자 고유 표현을 표준 코퍼레이트 톤으로 평탄화하지 않는다.

### 워크드 예시 (Before → After)

1. **Before(한국어):** "저는 어떤 일이든 성실하고 책임감 있게 임하며, 끊임없는 열정으로 귀사의 무한한 가능성에 발맞춰 일익을 담당하고자 합니다. 다양한 경험을 통해 소통 능력과 문제 해결 능력을 길렀습니다."
   **After:** "재고 데이터 정합성 문제로 월 평균 12건의 오배송이 발생하던 물류팀에서, 저는 주문-재고 대조 스크립트를 직접 만들어 야간 배치에 넣었습니다. 그 결과 오배송은 3개월 만에 월 2건으로(약 83% 감소) 줄었고, CS 문의도 40% 감소했습니다."
   **왜 더 나은가:** Before는 추상 성격 나열·클리셰("무한한 가능성/일익을 담당")뿐이라 누구나 복붙 가능하다. After는 STAR로 상황(월12건)·행동(스크립트·야간배치)·결과(월2건, CS 40%↓)를 수치로 보여준다. "83%"는 입력 12→2의 **허용된 파생 환산**이라 fact-lock을 위반하지 않는다.

2. **Before(한국어, 번역투):** "이번 프로젝트에 있어서 저는 데이터 분석에 대한 역량을 가지고 있으며, 이를 통해 리텐션 개선을 진행하였습니다. 또한 협업 능력도 갖추고 있습니다."
   **After:** "마케팅 로그 12만 건을 SQL로 분석해 이탈 구간을 찾았고, 리텐션을 8%p 올렸습니다. 인턴 2명을 온보딩하며 분석 대시보드 표준을 만들었습니다."
   **왜 더 나은가:** Before는 번역투("~에 있어서/~에 대한/~을 통해/가지고 있으며/진행하였습니다")와 "~을 갖추고 있습니다" 정의문이 골격이다. After는 번역투를 걷어내고 두 개의 구체 성과(수치 포함)로 능동태 단문을 쓴다. 정보는 늘고 길이는 줄었다.

3. **Before(영문 지원서):** "I am thrilled to leverage my robust skill set to delve into new challenges and showcase my ability to navigate complex environments—driving innovation, fostering collaboration, and underscoring my passion for excellence."
   **After:** "I led the checkout-API rewrite for 3 engineers over 4 months. We cut p95 latency from 1,200ms to 380ms and reduced payment errors by 27%. I want to bring that same focus to your payments team."
   **왜 더 나은가:** Before는 영어 과잉어휘(leverage/delve/showcase/navigate/foster/underscore)·em-dash·삼단열거·빈 열정어가 전부라 사실이 0개다. After는 역할·기간·인원·전후 수치로 능동 단문을 쓴다. (영문일 때만 영어 lexicon이 1차로 작동한다.)

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **캘리브레이션 경고:** 아래 임계값(em-dash 2개, 사실토큰, 문장길이 표준편차 등)은 주로 영어 코퍼스에서 온 **잠정 수입품**이다. Phase B에서 한국어 합격 자소서 코퍼스로 percentile 캘리브레이션하고 분기별 재조정해야 한다. lexicon은 후행 지표(모델 RLHF가 tell을 학습해 회피 중)이므로 **버전·출처일자를 필수로 기록**한다. 모든 카운트 임계는 "하드 fail"이 아니라 "신호" 우선이며, 게이트로 쓰는 것은 R5·R6·R9뿐이다.

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 한국어 슬롭 사전 매칭(번역투·클리셰·수동태) | 매칭 0건(있으면 치환 제안+사람 판단). **soft** | locale='ko' 사전(번역투 "~에 대한/~을 통해", 클리셰 "급변하는 시대/4차 산업혁명/귀사의 발전에 기여", "~되어졌습니다")으로 부분문자열 매칭, 히트 카운트 |
| R2 | 영어 과잉어휘(영문 지원서 한정) | locale='en'일 때만 적용, 치환 제안. **soft** | 단어경계 `\b(delve|leverage|utilize|showcase|...)\b` 정규식, 기술맥락(robust error handling 등) 화이트리스트 예외. locale='ko'면 가중치↓ |
| R3 | 형식 tell(가운뎃점·이모지·굵게·em-dash) | 가운뎃점 남발·이모지 0, em-dash≤2(영문만 변별력). **soft** | `·` `—` 이모지 유니코드·`**` 출현 카운트. (한국어 자소서에서 em-dash 변별력은 사실상 0 — 가운뎃점이 더 중요) |
| R4 | 헤징/메타 코멘트 | 매칭 0건. **soft** | 사전("it's important to note/물론/전반적으로/어떻게 보면") 부분문자열 매칭 카운트 |
| R5 | 빈 열정어·자기선언 상투구 | 매칭 0건(있으면 각 1개를 구체 사실로 대체). **gate** | 사전("열정을 가지고/최선을 다하겠습니다/빨리 배웁니다/I am excited to/I want to/fast learner/great fit") 매칭 카운트 |
| R6 | 증거 밀도(주장당 사실) | 주장 1개당 사실 토큰(숫자/%/기간) ≥1. **gate**(1차 게이트) | 한국어=어절 기준, 영어=word 기준으로 분리. 숫자 `\d`, `%`, 기간 `\d+\s*(년\|개월\|주\|month\|year)` 카운트. 한국어 "대문자 고유명사"는 세지 않음 |
| R7 | 사실 잠금(fact-lock) | 입력에 없는 숫자·고유명사 0건(파생 환산 제외). **LLM 보조 플래그**(게이트 아님) | 숫자 정규화(콤마/단위/한글수사: 1,200ms=1200ms, 12만=120,000) 후 차집합. 차/합/비율 화이트리스트. 한국어 고유명사는 NER 없이 못 잡으므로 연결된 AI가 최종 판정 |
| R8 | 목소리 보존(평탄화 금지) | 산출물 평균 문장길이가 사용자 원문 샘플 ±30% 이내, TTR 유사. **soft** | 사용자 원문 샘플과 산출물의 평균 문장길이 차이·어휘다양성(TTR) 비교. 순수 산술 |
| R9 | 글자수 상한 | 공고/플랫폼 max_chars 이하. **gate** | `text.length` ≤ max_chars. 가장 객관적인 결정론 체크 |
| R10 | 직무 키워드 커버리지 | `matched_keywords` 중 산출물이 증거와 함께 다루는 비율 ≥ 목표치. **soft** | get_application_context의 keyword 집합과 산출물 토큰 교집합 비율 |
| R11 | 회사명 정합 | 산출물의 회사명 = 대상 공고 회사명. **gate** | 공고의 company 문자열이 산출물에 존재, 타 회사명 부재 확인(타 회사 복붙 탐지) |
| R12 | 문장 길이 변주(burstiness) | 문장 ≥6개일 때만 적용, 표준편차 ≥5단어. **soft(신호일 뿐 목표 아님)** | 문장 분리 후 단어수 표준편차. 짧은 문항(<6문장)은 통계 무의미하므로 미적용 |

**주요 실패 모드:**
1. **동문서답·직무 무관** — 슬롭이 0이어도 JD와 무관한 자랑이면 떨어진다(R6·R10·채용 1차 탈락 사유).
2. **회사명 오기재·글자수 초과** — 결정론으로 가장 쉽게 잡히는 치명적 실수인데 자주 누락된다(R9·R11).
3. **환각·출처 없는 정성 과장** — 입력에 없는 수치/수상, 또는 숫자 없는 "크게/탁월한" 정성 주장. 면접에서 즉시 발각(R7 + Don't의 정성 주장 금지).
4. **false-positive 오탈락** — 영어 사전을 한국어에 그대로 적용, 정상 3항 명사나열을 삼단열거로 오탐, 짧은 문항에 burstiness 강제. 이를 막으려 게이트는 R5·R6·R9·R11로 한정하고 나머지는 soft 신호로 둔다.
5. **사전 시효성(adversarial drift)** — 2024 'delve' 통계는 후행 지표. 버전 미기록·미캘리브레이션 lexicon은 정상 글을 오탈락시킨다.

## 4. 출처 (Provenance)

- **humanize.ts / epoko77-ai/im-not-ai** — 한국어 AI-tell 분류(번역투·클리셰·기계적 병렬·수동태·형식 과용)의 1차 근거. **이 문서의 한국어 ban-list 본체.** (`packages/prompts/src/humanize.ts`, MIT License)
- **Kobak et al., "Delving into LLM-assisted writing…"** — 영어 과잉어휘 사전의 실측 근거(delve +1500% 등). **단 영문 지원서 한정 보조 기준**으로만 적용. · https://arxiv.org/abs/2406.07016
- **The Augmented Educator, "Ten Telltale Signs of AI-Generated Text"** — 헤징·정형 템플릿(2~5배)·낮은 burstiness·장식 명사·개인 목소리 부재. dontList 다수 근거. · https://www.theaugmentededucator.com/p/the-ten-telltale-signs-of-ai-generated
- **The Conversation, "Too many em dashes? … Spotting text written by ChatGPT" (2025)** — em-dash 일화적 근거이자 **"단일 지표 맹신은 과학보다 art"라는 한계 경고** — R3을 soft로 강등한 근거. · https://theconversation.com/too-many-em-dashes-weird-words-like-delves-spotting-text-written-by-chatgpt-is-still-more-art-than-science-259629
- **Strunk & White, "The Elements of Style"** — 간결성(Omit needless words)·능동태. · https://news.cornell.edu/stories/2009/03/omit-needless-words-elements-style-turns-50
- **TopResume "9 Cover Letter Cliches" / The Muse / Univ. of Michigan Career Center** — 빈 열정어·자기선언 금지, Show-don't-tell. · https://topresume.com/career-advice/cliches-cut-from-cover-letter
- **링커리어·하이잡·대웅 뉴스룸 STAR 기법 가이드** — 한국 채용: 두괄식("저는 ~입니다" 대표문장 정석), STAR, 추상 성격 나열 금지. · https://community.linkareer.com/employment_data/4464545
- **CareerMate AGENTS.md** — 프라임 디렉티브("두뇌는 당신, 저장은 CareerMate"), 사실·수치·고유명사 보존, get_application_context의 matched/missing_keywords.

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_writing_style_guide(doc_type, locale)` 확장 — 위 원칙·Do·Don't를 locale별(ko 우선, en 보조)로 반환. 기존 humanize.ts를 이 데이터의 1차 소스로 흡수.
  - `check_human_writing(text, locale, sourceFacts?, maxChars?, jdKeywords?, voiceSample?)` 신설 — **LLM 없이 결정론**으로 violations 배열 + pass/fail 반환. R1~R6·R9~R12는 순수 JS 카운트/정규식/집합연산. **R7(fact-lock)·R10·두괄식 본질은 "휴리스틱 플래그"로 반환하고 최종 판정은 연결된 AI에게 위임**(한국어 NER·의미 판정 불가 인정).
- **데이터 형태 힌트:**
  ```
  styleGuide: { domain, locale, principles[], doList[], dontList[] }
  lexicons: {                       // 버전드 JSON, 거버넌스 메타 필수
    _meta: { version, sourceDate, calibratedOn, changelog[] },
    slop_ko: [{term, replaceWith, regex?}],   // 1차
    aiOveruse_en: [{term, replaceWith, wordBoundary:true, contextWhitelist:[]}], // 영문 한정
    hedging: [], emptyEnthusiasm: [], formatTells_ko: ['·','**','emoji']
  }
  rubric: [{ id, check, passBar, regexOrLexiconRef, locale, severity:'gate'|'soft'|'llm-flag', minSentences? }]
  ```
  - **입력:** `{ text, locale, sourceFacts?, maxChars?, jdKeywords?, voiceSample? }`
  - **출력:** `{ score, gatePassed, violations:[{ruleId, severity, count, matches:[{text,offset}]}], factLock:{normalizedNumbers, unmatched[], note:'LLM-confirm'}, jobFit:{coverage, missing[]}, metrics:{emDash, midDot, sentenceLenStdev, evidencePerUnit, charCount, voiceDelta} }`
  - **거버넌스(필수):** lexicon 변경은 (a) version/sourceDate 기록, (b) 한국어 false-positive 회귀 테스트셋 통과, (c) 합격 자소서 N건 + AI 슬롭 N건 골든셋에 대한 precision/recall 리포트, (d) 분기별 재캘리브레이션 트리거를 거친다. 기술 용어 화이트리스트(robust/foster/navigate)는 contextWhitelist로 관리.
