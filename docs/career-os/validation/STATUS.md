# STATUS — Career-OS 검증 루프 (라운드 6에서 중단, 이어가기용)

> 다음 세션이 여기서 이어받는다. 정본 지시=[MANDATE.md](MANDATE.md), 방법론=[PROTOCOL.md](PROTOCOL.md)(§8 라운드 방법론), 지침=`../eop/`, 지식=`../knowledge/`.
> 발견사실(평가자 편향·calib·2-vendor 한계)=[README.md](README.md) · 정본 적용 추적=[APPLIED.md](APPLIED.md).
> 마지막 갱신: 2026-06-18, 라운드 6 종료.

> **수렴 표기:** 아래 결과는 **2-vendor 교차검증 수렴**(claude 계열 + codex; Gemini 부재)이다. "3-LLM 만장일치"로 쓰지 않는다. 최종 게이트는 cross-vendor(codex) 기준이며 claude 단독 자기평가는 사인오프로 인정하지 않는다(상세 [README.md](README.md)). 합의로 확정·**정본 적용 완료**된 3 수정은 [APPLIED.md](APPLIED.md)에 대장으로 기록됨(reconfirm 12/12 agree).

## 1. 어디까지 왔나 (결론)
- **목표 달성:** 산출물 **12/27 unanimous-clean**(두 판정자 모두 critical 0·major 0), 그중 2개 unanimous-perfect. 목표 10+ 충족.
- 12 clean이 **5대 기능 전부**에 분포: cover-letter(cl-s2), fit(fit-s1/s2/s3), interview(s1/s2), job(s1), profile(s1/s2).
- **negative controls 4종 전부 fail**(opus·sonnet 모두, 점수 2~8) — 평가자 변별력 확인. 즉 좋은 건 통과·나쁜 건 탈락.
- 단, **현재 basis는 Claude-강화 평가(opus+sonnet, per-claim 사실감사)** 다. Codex/Gemini는 아래 §4 미해결로 미반영.

## 2. 라운드 이력 (요약; 상세=`runs/ledger.jsonl`)
| 단계 | 결과 |
|---|---|
| R1 | 6/10 — 단, Claude 단독 평가가 관대(신뢰 낮음) |
| R2 | 적대적 평가가 과도하게 엄격(필수 점수를 '날조'로 오판) + 진짜 결함 3건 노출 |
| 평가자 보정 | FAIR 지시(C4=후보·회사 사실 발명만; 분석의 자체 산출물은 면제)로 7/7 변별(neg fail/good pass) |
| 합의#1 | 3 수정(cl 마커 위치·interview "왜?" 앵커·profile duty/achievement) 만장일치 적용 |
| R3 | 8/21 clean(멀티모델 codex+claude) |
| 합의#2 | cover-letter STAR 앵커-우선 수정 — haiku 반대→문구 수정→만장일치(밀어붙이지 않음) |
| Codex/Gemini 다운 | Codex 사용량 한도, Gemini rate-limit → 사용자 승인하에 **Claude 멀티모델+강화평가**로 전환 |
| 강화평가 검증 | opus+sonnet+per-claim 감사가 codex가 잡은 *미묘한* 날조도 포착(검증됨) |
| 합의#3(경계) | "사실 앵커 경계"(일반원리 프레이밍 허용/후보 미기재 사실·지표·사고 단정 금지) 만장일치 → EOP+평가자 동시 적용 |
| R5 | 8/21 clean(경계 적용; 판정자 정렬↑, cl-s2 opus가 clean으로 전환) |
| R6 | 신규 시나리오 3개 추가 → **누적 12/27 clean** ✅ |

## 3. 합의로 적용된 지침 수정(공정 패널: codex+claude opus/sonnet/haiku, 만장일치만)
모두 평가 증거에서 출발, 오케스트레이터 주관 아님. 반대 1건이라도 있으면 문구 수정 후 재확인:
1. cover-letter §4 ①: 제출 본문은 코드펜스 안에 본문만, 안내·글자수는 블록 밖.
2. interview §2 step5: "왜/어떻게/순서" 답변에서 미기재 의사결정 이유·근거·순서 단정 금지(일반원리는 분리).
3. profile §2 step4: 수치·결과 없는 "수행/진행/개선"은 responsibility, achievement는 명시적 outcome일 때만.
4. cover-letter §2 step4(P4): STAR 앵커-우선(저장 행위·결과에만 앵커; 발명만 금지, Action은 풍부히 허용).
5. cover-letter §2 step4(경계): 일반 도메인 프레이밍 허용 / 비즈니스임팩트·사고귀속은 저장이 함의하는 범위만 / 중간지표·측정행위 발명 금지. **이 경계는 평가자 루브릭에도 동일 적용.**
6. (README/EOP) 사실 3분류·내부 프레임명 노출 금지 등 R1 합의분.

## 4. 미해결 / 다음에 할 일
- **Codex/Gemini 재조정(최우선):** 리셋되면 (a) P4(STAR 앵커)에 대한 **codex 표결 재확인**(현재 claude 3모델 만장일치, codex 대기 — `eop/cover-letter.md`의 `<!-- ... codex 재확인 대기 -->` 주석), (b) codex+gemini를 **생성자·평가자로 다시 투입**해 cross-vendor로 12 clean을 재검증, (c) 그들이 새 결함을 잡으면 합의 게이트로 수정.
- **haiku 생성자**는 7/7 fail — 약한 모델은 지침대로도 clean 도달 실패(정보적, 차단 아님). 약한 모델 보조 여부는 선택.
- **잔여 near-miss**(cl-s1, cl-s2.sonnet, interview-s2.sonnet): 단일 결함. 더 돌리면 추가 수정 후보.
- **커버리지 확장:** 16개 지식 도메인 중 5대 기능만 검증함(résumé·ats·linkedin·salary·offer·onboarding 등 미검증). 추가 시나리오·기능으로 확장 가능.

## 5. 하니스 사용법(이어가기)
- 생성/평가 드라이버: `runs/bin/run.sh <codex|gemini|claude> <gen|eval> <promptfile> <outfile>`(codex eval은 `schema/eval.schema.json` 강제).
- 집계: `node runs/bin/aggregate.mjs` → out/의 `*.eval-*.json`을 모아 unanimous-clean 집계(+ledger append).
- 평가자 보정 점검: `node runs/bin/calib_check.mjs`(neg fail/good pass). 합의 집계: `runs/bin/consensus_check.mjs`.
- 라운드는 Workflow 스크립트로 실행(세션 임시 경로에 저장됨). 다음 세션은 PROTOCOL §8 + 이 문서로 동형 워크플로우를 재작성해 이어간다.
- 산출물·평가·negatives: `runs/out/`, `runs/negatives/`, `runs/calib*/`, `runs/fixtures/`, 원장 `runs/ledger.jsonl`.
- **평가자 핵심 지시(강화 FAIR):** C4=후보·회사 사실(수치·경력·이벤트) 발명만. 분석의 자체 산출물(점수·밴드·신뢰도·라벨된 추정/권고)은 면제. per-claim 사실감사 + 사실앵커 경계(§3-5) 적용. opus+sonnet 둘 다 c0·m0 = clean.

## 6. 미커밋
모든 변경 미커밋(git). 다음 세션에서 커밋 여부 결정.

---

# 라운드 7 (2026-06-20, 진행 중 — 보정-델타 + 지식 표면 감사 + 출처 보강)

> 정본 상세: [runs/r7/ROUND7.md](runs/r7/ROUND7.md)(L1·L2 결과), [runs/r7/FIXES.md](runs/r7/FIXES.md)(수정 스펙),
> [runs/r7/research-raw.json](runs/r7/research-raw.json)(출처 보강 원본). 사용자 정의 목적: **지침/지식/EOP가 LLM을 보정하는지** 검증.

## 7.1 하니스 개선 (정본 = bin/run.sh)
- **블라인드 클린룸**: codex를 `/tmp` + 격리 `CODEX_HOME=/tmp/codex-clean`(auth만)으로 실행 → 프로젝트 AGENTS.md(CareerMate)·전역 OMX·hooks·MCP 제거(검증: "no AGENTS.md/project instructions loaded", 25k→9k tok). **라운드 1~6 codex는 AGENTS.md 오염 상태였음**(블라인드 위반) — R7부터 해소.
- claude도 `--model` 지원(opus/haiku). gemini=**IneligibleTier(개인티어 단종)** 보류. **agy(Antigravity 1.0.10, `-p` 헤드리스) 사용 가능** — 단 기동 느림. 이번 수렴=**codex+claude 2-vendor**.
- 신규 하니스: `bin/ab_one.sh`(시나리오 A/B 토너먼트), `bin/ab_summarize.mjs`, `bin/l2_audit.wf.js`, `bin/consensus.wf.js`, `bin/research_enrich.wf.js`, `bin/research_enrich2.wf.js`.

## 7.2 L1 보정-델타 (무지침 A vs 지침 B, codex 클린 채점) — 12 시나리오, 6기능+커버리지
- **강한 모델(opus): 지침이 강력·일관 보정** — 진짜 케이스 avg ≈ +19, fail→pass 5건(fit-s1/s2/s3·profile-s1·cd-s1), cross-vendor(codex생성→claude채점) 88~90 재현. **6기능 전부 + 신규 career-description 입증.**
- **약한 모델(haiku): 역효과** — 풍부한 EOP에 과생성·환각(없는 날짜·%·NCS코드·신뢰도 날조, 거짓 자가검증). 보정은 모델 능력 의존.
- **저점수(보정 미완, 재측정 대상)**: interview-s2 B58·interview-s1 B62·cl-s1 B55·job-s1 B72. cl-s2(−17)·cd-s2(−10)는 **채점 헤더 버그**(메모를 제출물로 오인 + 파생수치 과엄격)로 인한 아티팩트 → 헤더 수정 후 재측정.

## 7.3 L2 지식 표면 감사 (28문서: EOP6+knowledge16+verifier6) — broken 0
- **A1 ✅(코드)**: `eop/fit-analysis`가 런타임 미serve(DEAD)였음 — analyze_job 라우트가 job-analysis만 줌. → `eop`를 배열화하고 analyze_job에 fit-analysis 추가. **L1 최고 보정 기능이 드디어 프로덕션 도달.** (packages/knowledge/src/index.ts, typecheck 0)
- **A2 ✅(코드)**: `manage_application_status` 라우트 신설(rejection-triage·offer·salary) + prepare_interview에 recruiter-screen. 고아 지식 일부 해소. (남은 고아=linkedin·portfolio·networking·onboarding → 새 워크플로우 id 필요, 후속)
- **B(텍스트, 합의 대상)**: analyze_job 임계값 3중충돌(fit-matching/job-analysis/responsiveness), ats vs ats-compat 모순, 도메인 소유권 충돌(offer/onboarding/rejection/portfolio), human-voice σ 게이트 불일치.
- **C(정직성)**: ats-compat·cover-letter(lint)·fit-matching·linkedin·portfolio·interview-behavioral이 미구현 런타임 검증을 사실처럼 표기 → "Phase B" 정직화.

## 7.4 합의 게이트 1차 (codex+claude opus/sonnet/haiku) — 8건 전부 MODIFY(반대 0)
패널이 스코프·증거·문구 정밀화. 핵심 정정: P1 "메모 위치는 미재현 — 진짜는 내부 어휘 누출+C4 발명". 정밀화 스펙=FIXES.md. **적용 전 재확인(reconfirm) 라운드 필요.**

## 7.5 출처 보강 리서치 (전문가화)
- **pass-1**(14문서, gov/대학/공식): enrich 92·출처 176, `runs/r7/research-raw.json` 저장. interview-prep 결함(confabulation) 정조준 자료 확보.
- **pass-2**(사기업 실전·직군별 7문서): 사람인·잡코리아·캐치·헤드헌터·실제 면접질문/합격자소서 패턴(일화는 [참고] 등급), NCS=공공트랙 라벨. **진행 중.**

## 7.6 다음 (이어가기)
1. pass-2 수신 → pass-1+2 enrichment를 문서별로 통합(출처 등급 보존·날조 금지).
2. **재확인 패널**(FIXES.md 정밀화안 + C4 발명 하드닝 + 약한모델 대응) → 만장일치 agree만 적용.
3. 정본 수정(EOP/knowledge/verifier/채점헤더) + APPLIED.md 대장 + 본문 인라인 마커.
4. 저점수(interview·cl·job + cd 재측정) A/B **재측정** → B가 PASS(≈85+) 도달 확인.
5. STATUS 갱신 + **커밋**(라운드6부터 누적 미커밋).

## 7.7 interview 보정 완료 (2-트랙 + 발명차단 출력형식) ✅
- **결과: interview-s1·s2 둘 다 B 82 / PASS / 치명결함 0** (s1: 58→62→72→82, s2: 12→…→82). 최악 함수가 fail→pass.
- **방법**: ① 제품의 2-트랙(기술/실무 ↔ 인성·컬처핏)으로 EOP 재편 ② 답변 출력형식을 '저장사실 앵커 골격 + `[확인 필요]`/`[면접 전 채우기]` 슬롯'으로 강제 → **유창한 거짓 서사 생성 차단**(발명=C4 제거). pass1+2 출처보강(34 enrich·89 출처)도 통합.
- **핵심 통찰**: 발명(치명·위험) → 정직한 빈칸(경미·올바름) 트레이드오프. 잔여 major는 대부분 '슬롯이 비어 미완성'으로 읽힌 것 — fixture 데이터가 얇아서지 킷 결함 아님(실제 사용자 풍부 데이터면 채워짐). **빈칸 메우려 발명 허용 금지.**
- 편집 문서: eop/interview-prep.md(+P1/P4/P8·2트랙·발명차단), knowledge/interview-behavioral.md(+P8 Phase-A 정직화), interview-technical.md. 하니스: bin/apply_interview.wf.js·iterate_interview.wf.js.
- **다음 적용 대상(같은 레시피)**: cl-s1(B55)·job-s1(B72) 등 저점수 + L2 weak 지식.

## 7.8 전 생성 기능 PASS 달성 (린 구조 규칙) ✅✅
**6개 기능 12 시나리오 전부 PASS·치명결함 0** (opus B, 블라인드 cross-vendor codex):

| 기능 | 시나리오 | B | 판정 |
|---|---|---|---|
| 자소서 | cl-s1 / cl-s2 | 94 / 94 | PERFECT / PERFECT |
| 경력기술서 | cd-s1 / cd-s2 | 82 / 92 | PASS / PERFECT |
| 면접 | interview-s1 / s2 | 82 / 82 | PASS / PASS |
| 적합도 | fit-s1/s2/s3 | 86/84/86 | PASS×3 |
| 공고분석 | job-s1 | 84 | PASS |
| 기본정보 | profile-s1/s2 | 88/86 | PASS / PASS |

- **핵심 교훈(사용자 원칙 입증)**: 점수는 *내용 양*이 아니라 **린한 load-bearing 구조 규칙**에서 온다. cl-s1은 앵커 규칙 2줄로 55→94 PERFECT, cl-s2/cd-s2 음수는 채점 헤더 아티팩트(메모를 제출물로 오인+허용 파생 과엄격)였고 헤더 교정 후 94/92 PERFECT. → **interview의 두꺼운 가드도 추후 lean 정리 시 점수가 오를 여지**.
- 잔여는 전부 minor(톤·가독성·약한 추론 라벨링). cd 잔여 minor: 제출 본문 메타 주석 경계·원인 단정·도구 구체화.
- 편집 제품 문서(커밋됨): eop/{interview-prep,cover-letter,job-analysis,career-description}.md + knowledge/{interview-behavioral,interview-technical}.md + packages/knowledge/src/index.ts(A1·A2).

## 7.9 남은 일 (생성 기능 보정과 별개 — 우선순위 낮음)
1. ✅ **재확인(reconfirm) 패널 완료(2026-06-20)**: R7 생성기능 변경을 cross-vendor consensus(codex 클린룸 + claude opus/sonnet/haiku) R1→R3 수렴으로 ratify → APPLIED.md 대장 4행 + EOP 인라인 마커. 증거 종류 정직화(산출물 수준 cross-vendor PASS ≠ 결함-규칙 전용 표결). 커밋 52539a4.
2. ✅ **L2 문서간 정합/정직화 완료(2026-06-20)**: B1 임계값 경계(fit-matching·responsiveness, e3b530b)·B2 ats↔ats-compat 0.70 단일·advisory(d206d90)·B3 도메인 소유권 위임(2c86c19)·B4 human-voice σ게이트→advisory + C Phase-A 정직화(b77722b). FIXES.md P5~P8. 고아 라우팅 onboarding-90·networking → manage_application_status(173d1c4; linkedin/portfolio는 후속 예약).
3. ✅ **최종 교차 정리 완료**: interview 발명차단 규칙을 §0.1 단일 원본으로 통합(커밋 c523c19, PASS 유지).
4. **약한 모델(haiku)**: 발명차단 형식이 haiku 환각도 줄이는지 재확인(선택, 미수행).
5. **빌드·검증 ✅ green(2026-06-20, 재확인)**: `npm run typecheck`(0)·`npm run build`(0, dist/career-os에 개선 EOP 반영)·`npm test`(67통과·0실패). 변경이 런타임에 고정됨. 실제 npm/.mcpb **배포(publish)는 별도**.

## 7.10 라운드7 마무리 세션 (2026-06-20) — L2 위생 적용 + consensus 3라운드 수렴

§7.9 남은 항목을 fair-panel consensus 게이트(codex 클린룸 + claude opus/sonnet/haiku)로 ratify 후 적용. **3라운드 84표 disagree 0**으로 수렴(R1=방향 합의 → R2/R3=문구 정밀화). 패널이 오케스트레이터의 증거 오기 2건을 잡아냄: (a) cl-s1=94는 **opus 생성·codex 채점**이고 codex 직접 생성 cl-s2는 **90 PASS**(94 아님, 모든 94는 opus 생성), (b) AGENTS.md L22는 **지원-상태 enum**이지 탈락-단계 enum이 아니다. 커밋: 52539a4(reconfirm)·e3b530b(B1)·d206d90(B2)·2c86c19(B3)·b77722b(B4+C)·173d1c4(orphan). 빌드·회귀 재확인: typecheck 0·build 0·test 67통과·0실패.

**남은 후속(follow-up — 본 라운드 스코프 밖):**
- **codex P4 규칙-텍스트 전용 표결**: P4 STAR 앵커·사실앵커 경계는 R7 cross-vendor 생성-채점 PASS로 *간접 지지*만 확보(닫힘 아님). codex 용량 회복 시 규칙 텍스트 전용 표결로 닫을 것.
- ✅ **human-voice C4·C5 게이트 정렬 완료(2026-06-20)**: C3·C4·C5(단조성 신호)를 모두 advisory(권고 신호)로 통일 — human-writing.md 게이트 집합 R5/R6/R9/R11과 정합. 뚜렷한 위반(연속 3문장 동일 시작어·단락 내 3단 병렬 2회 초과)엔 구체 수정 제안 유지(재작성 강제는 아님). consensus 2라운드 수렴(codex agree). cross-verifier 근거 구분(C5=Wikipedia / C3·C4=burstiness)은 §4 보존. (P4 codex 규칙-전용 표결도 2026-06-20 닫힘.)
- **linkedin/portfolio 전용 워크플로우 id**: 두 personal-brand 도메인은 on-demand 유지 중. get_workflow_guide enum + definitions.ts에 전용 id 신설(예: build_personal_brand) 시 onboarding/networking의 manage 중복 잔존 여부도 함께 결정.
- **약한 모델(haiku)·풍부 fixture 재측정**: 선택 항목, 미수행.

§7.8 보정: 스코어보드의 cl-s2=94는 **opus 생성·codex 채점**(블라인드 cross-vendor) 점수다. codex 직접 생성 cl-s2는 90 PASS(claude 채점) — 둘 다 PASS이나 생성/채점 주체가 다르다.

## 7.11 데이터-한계 입증 + 약한 모델 재확인 (2026-06-20, item 4·5)

풍부 fixture `interview-s3-rich`(interview-s1과 동일 후보지만 저장 데이터에 개선 순서·이유·본인 역할·장애 복구 과정·갈등/실패 일화까지 풍부화)로 재측정. 블라인드 cross-vendor.

| 생성 | 무지침 A | 지침 B | 판정자 |
|---|---|---|---|
| opus | 72 fail | **84 PASS**(치명 0, major 3) | codex 클린룸 |
| haiku | 22 fail | 58 fail(치명 C4 **5건**) | codex 클린룸 |
| codex | — | **PASS · 날조 0**(R4 부분미달만) | claude(cross-vendor) |

**item 4 (데이터-한계) — 부분 입증 + 정밀화:**
- 풍부 데이터가 *기술 사실* 빈슬롯을 제거(opus 치명 0). 얇은 fixture B=82 → 풍부 B=84.
- +2에 그친 이유: opus B의 잔여 major 3건이 전부 **주관적·후보 전용 슬롯**(지원동기·입사후 포부·자기평가)이다 — 저장 데이터로 채울 수 없고 EOP가 *정직하게 빈칸으로 둔* 항목(채우면 C4 발명). codex 생성분은 cross-vendor에서 **날조 0·PASS**(claude 판정: "저장 데이터에 강하게 앵커, 환각/날조 없음").
- **결론: 82 천장 = 얇은 기술 데이터(풍부화로 해소) + 설계상 올바른 주관 슬롯. 가드 bloat가 아니라 가드가 정상 작동.** 채점관이 그 슬롯을 '미완성'으로 감점하나, 후보가 면접 전 채울 항목이라 비우는 게 정답.

**item 5 (약한 모델 haiku):** 무지침 22 → 지침 58(+36). 풍부 데이터 덕에 지침이 *도움*(얇은 fixture에서 지침이 haiku를 악화시킨 R7 역효과와 반대 — 실제 사실이 있으니 덜 지어냄). **그러나 지침 B에도 C4 날조 5건**(평상시 실패율·타사 지원·심리 단정·RabbitMQ 임계·정산 일관성을 사실 없이 추가). 발명차단 형식은 약한 모델 환각을 줄이지만 *제거하지 못한다* — 보정은 모델 능력 의존(R7 재확인).

**⚠ 지침 변경: 없음(의도적).** 위 잔여 결함은 (a) 설계상 올바른 주관 슬롯이거나 (b) 약한 모델 한계라 **지침으로 고칠 대상이 아니다** — 고치면 발명을 유발하고 지침만 비대해진다(린 구조 규율). 즉 이 측정은 현재 지침을 *검증*한 것이지 수정 트리거가 아니다. fixture·prompt·산출물은 gitignore 스크래치(`runs/fixtures/interview-s3-rich.md` 등).
