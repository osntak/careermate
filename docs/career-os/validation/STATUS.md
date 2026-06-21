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

### 7.11.1 §0.1 린 실험 — "더 깎을 수 있나" 실측 (2026-06-20)
"발명차단 §0.1을 4원칙(앵커·슬롯·꼬리·정직)으로 압축하면 점수 유지하나?" 가설을 실측. 린 §0.1(§0.1+§0.1.1+§0.1.2를 ~42줄→~16줄로, GOOD/BAD 압축, EOP 227→195줄)로 재측정:

| 시나리오 | 두꺼운 §0.1 | 린 §0.1(4원칙) |
|---|---|---|
| interview-s1 (얇은 데이터) | 82 PASS | **66 fail(치명 2: C4 주도성 발명·R5 실패 미완)** |
| interview-s3-rich (풍부 데이터) | 84 PASS | 84 PASS(유지) |

**결론: §0.1 두꺼움은 bloat가 아니라 load-bearing이다.** 린은 *풍부 데이터*에선 84 유지(주도성 사실이 데이터에 있어 발명 불요)했으나 *얇은 데이터*에선 82→66 폭락 — 모델이 인재상('주도적으로 정의')에 맞추려 없는 기여·리더십·팀조율을 발명했고, 린 §0.1이 못 막았다. **4원칙은 골격이 맞지만, 그 원칙을 얇은 데이터에서도 지키게 하는 워크드 예시(GOOD/BAD)·기여-발명 가드까지 빼면 깨진다.** 현재 §0.1은 이미 린 한계점 — 더 깎으면 가장 어려운 케이스(얇은 데이터+인재상 압박)에서 발명이 재발한다. **→ 정본 §0.1 불변(린 버전 미적용, /tmp 스크래치만). 다음 세션은 §0.1을 재-린하지 말 것.** (단일 런 결과지만 결함이 구조적으로 설명되고 풍부-데이터 대조군이 유지돼 신호는 명확.)

## 7.12 최종 전체-카테고리 A/B 검증 + 다이어트 실험 (2026-06-21)
6개 기능 대표 시나리오로 무지침(A) vs 지침(B) 신선 측정(블라인드 codex 채점):

| 기능 | 무지침 A | 지침 B | Δ |
|---|---|---|---|
| 면접 interview-s1 | 42 | 82 | **+40** |
| 공고분석 job-s1 | 58 | 86 | **+28** |
| 적합도 fit-s1 | 64 | 84 | **+20** |
| 경력기술서 cd-s1 | 84 | 94 | **+10** |
| 자소서 cl-s1 | 88 | 94 | **+6** |
| 기본정보 profile-s1 | 86 | 86 | +0 |

**평균 +17.** 어려운 작업일수록 지침 효과가 크다(면접·공고·적합도). 무지침도 잘 되는 작업(기본정보·자소서·경력기술서)은 지침이 PASS/PERFECT로 마무리. profile +0은 '정보 추출은 발명 여지가 적음'으로 합리적.

**다이어트 실험(§2.10~2.12 콘텐츠 제거, EOP 227→204줄):** §0.1 린과 동일 패턴 — interview-s1/s2(얇은) 82→**72 fail**(치명 재발), s3-rich(풍부) 84 유지. 그 콘텐츠 블록도 끝에 §0.1 발명 가드를 박고 1분자기소개는 킷에 실제로 쓰여 load-bearing. **→ 다이어트 미적용, 정본 불변. 면접 EOP는 §0.1·콘텐츠 양쪽 모두 린 한계점**(EOP-only 검증 방식상 EOP가 자기충족적이어야 함; 진짜 슬림화는 EOP+knowledge 동시 검증으로 별도 추진).

**90미만 잔여 진단(결함 무조건 받지 않고 분류):** interview-82=**구조적**(얇은 데이터+주관 슬롯, 입증). fit-84·job-86=**실행 슬립+채점관 정밀 nit**(내용은 정확, 가드 추가는 bloat→미수정). profile-86=**정직성 2갭**(JSON Resume 과대주장·'발명 0 보장' 자기도장 — 후자는 EOP가 결함을 *지시*하던 버그) → lean 1줄×2 수정(§7.12.1, consensus 게이트).

### 7.12.1 profile 정직성 2갭 수정 + 점수 변동성 발견 (2026-06-21)
profile-s1 B=86의 잔여 결함(M1 JSON Resume 과대주장·m1 '발명 0 보장' 자기도장)을 lean 정직성 가드로 수정(consensus codex+opus/sonnet/haiku 수렴, sonnet agree). **핵심: EOP §4가 모델에게 '발명 0 보장 명시'를 *지시*하던 게 자기도장 결함의 직접 원인 — 버그 수정.** 패널 정밀화 반영: 자기도장 대신 **충실도 노트(폐기/확인 항목)로 redirect**(1인칭 자기검증 선언 자체를 제거), JSON Resume 확장은 '기반(일부 확장)'으로 정직 표기, §5 루브릭 '스키마 준수'도 동기화.

**재측정 = 72(이전 86). 단 이는 수정 효과가 아니라 생성 변동성이다** — 72 런의 치명결함은 '원문에 없는 83% 지표 발명'으로, 수정이 건드린 항목(JSON Resume·자기도장)과 무관한 새 변동성 결함이다. **→ 단일 런 점수는 노이즈가 크다(86↔72, ±10+). 특정 sub-90 점수를 지침 미세조정으로 올리려는 것은 변동성이 효과를 덮어 신뢰 불가.** 수정 자체는 정직성 버그 제거라 **유지·커밋**(점수 상승 주장 아님). 이 변동성 발견이 '결함 무조건 받지 마라'(단일 nit 추격 금지) 원칙을 강하게 뒷받침한다. 90+ 안정 도달은 fixture 데이터 풍부화(§7.11 입증)가 지침 미세조정보다 효과적.

## 7.13 라운드 8 — 노이즈 바닥 분해 + 변동성 인식 결정 규칙 (2026-06-21)

> 7.12.1이 "단일 런 ±10+"를 *관찰*했다. R8은 그 노이즈를 **정량화·분해**한다 — 판정자(judge)와 생성(generation) 중 무엇이 노이즈를 만드는가. **결정적 측정**을 위해 LLM 오케스트레이션을 끼우지 않은 순수 bash 하니스(`bin/variance.sh`+`bin/variance_summarize.mjs`, 블라인드 codex 클린룸 `run.sh` 그대로)로 복제 측정한다(측정기 자신이 노이즈를 주입하면 안 되므로). 목적: **이후 결정이 단일 런이 아니라 분포에 기반하도록 루프를 엔지니어링한다.**
>
> 설계: **Block A=판정자 σ_judge**(고정 산출물을 codex가 K=5회 재채점 → 생성 고정·판정만 변동). **Block B=총 σ_total**(B를 opus로 K=5회 재생성→각 1회 codex 채점). 분해 **σ_gen=√(σ_total²−σ_judge²)**. guided 프롬프트는 현행(7.12.1 정직성 가드 포함) EOP와 동등 확인.

### 7.13.1 측정 결과 (K=5, 블라인드 codex)
**Block A — 판정자 변동성(동일 텍스트, 판정자만 5회):**

| 앵커 | 점수 | median | sd | range | verdict |
|---|---|---|---|---|---|
| cl-s1 (강, 4.4KB) | 88,88,94,94,95 | 94 | 3.5 | 7 | pass×2 **perfect×3** |
| profile-s1 (중, 5.3KB) | 82,82,82,86,86 | 82 | 2.2 | 4 | pass×5 |
| interview-s1 (장문, 22.6KB) | **66**,82,82,82,84 | 82 | **7.4** | 18 | pass×4 **fail×1** |

**Block B — 총 변동성(재생성+채점, 5회) + 분해:**

| 시나리오 | 점수 | median | σ_total | σ_judge | **σ_gen** | 지배원천 | 단일런 95%CI |
|---|---|---|---|---|---|---|---|
| profile-s1 | 58,72,72,78,88 | 72 | 10.9 | 2.2 | **10.7** | **생성** | ±21 |
| interview-s1 | 62,68,82,82,82 | 82 | 9.6 | 7.4 | **6.0** | **판정** | ±19 |

### 7.13.2 발견 1 — 판정자 노이즈 = "심각도 버킷 표류"
동일 산출물을 5회 채점해도 점수가 흔들린다. 메커니즘: **결함 *탐지*는 안정적**(매번 같은 실제 약점을 본다)이나 **경계선·사소 결함의 개수·심각도 버킷이 표류**한다 — cl-s1=minor 개수(0–1→perfect / 2→88 pass), profile-s1=major 개수(0→86 / 1–3→82), interview-s1=반복 major를 critical로 격상(k3만 crit2→66 fail). verdict가 결함 *개수*에 게이트되므로 표류가 헤드라인 점수·등급으로 전파된다. **표류 폭은 산출물 길이에 비례**(cl σ3.5 < profile σ2.2 < interview σ7.4). → **"perfect/fail"은 단일 런에서 비결정적 라벨**이다(cl-s1 동일 텍스트가 pass↔perfect, interview 동일 텍스트가 pass↔fail).

### 7.13.3 발견 2 — 두 노이즈 체제
- **profile-s1 = 생성 지배(σ_gen 10.7 ≫ σ_judge 2.2).** 판정자는 고정 텍스트에서 정밀하나 재생성이 요동: opus가 재생성마다 수치를 발명(crit↑→58 fail)하거나 안 함(→88 pass), 5회 중 4회 fail. **7.12.1의 86↔72는 판정 노이즈가 아니라 생성(발명) 노이즈였음이 확정.** → 안정화 레버 = **앵커 데이터 풍부화·발명 가드**(§7.11 입증), *지침 문구가 아님*.
- **interview-s1 = 판정 지배(σ_judge 7.4 ≳ σ_gen 6.0).** 장문 산출물은 고정해도 판정자가 σ7.4로 요동(버킷 표류·fail 1회). → 안정화 레버 = **K-복제·median 채점·modal verdict**. *interview sub-90을 문구로 올리려는 시도는 무의미*(판정자만으로 ±7·fail 깜빡임).

### 7.13.4 결론 — 단일 런 95%CI ≈ ±19~21
두 기능 모두 단일 (생성→채점) 측정의 95% 신뢰구간이 **약 ±19~21점**. 즉 **단일 런 점수는 ±10 수준에서 사실상 무정보**다. 7.12.1을 완전히 검증·정량화. **과거 단일 런 델타<~20점으로 내린 판단(린/다이어트/sub-90 추격)은 통계적으로 노이즈와 구분 불가.**

⚠ **소급 정정(결정 유지, 근거 교정):** §7.11.1 린("82→66")·§7.12 다이어트("82→72")의 단일 런 하락은 interview의 노이즈 범위 안이다(**현행 두꺼운 산출물도 1/5 런에서 66/fail**). "린/다이어트가 점수를 깎는다"는 *정량 주장은 단일 런으로 성립하지 않는다*. 정본 EOP 유지 결정은 그대로 옳다 — 새 규칙(PROTOCOL §10)이 "단일 런으로는 *어느 방향도* 행동하지 마라"이므로 린이 안전하다는 K-복제 증거 없이 재-린하지 않는다. **결론(현행 유지)은 보존, 근거를 "단일 런 하락"에서 "복제 미검증 → 보류"로 정직화.**

### 7.13.5 산출물(루프 엔지니어링)
- 새 하니스 `runs/bin/variance.sh`(Block A/B 복제·동시성 제어 `PAR`·`KJ`·`KG`)·`runs/bin/variance_summarize.mjs`(분포·σ 분해 집계). **`runs/`는 전체가 gitignore 스크래치**(기존 `run.sh`·`aggregate.mjs`와 동일 — 정본 기록은 이 §7.13 서술이고 스크립트는 재생성 가능). 재실행: `cd runs && MODE=all PAR=3 bash bin/variance.sh && node bin/variance_summarize.mjs`.
- 결정 규칙을 **PROTOCOL §10**에 정본화(다음 라운드 전제).
- 원증거(`out/r8/*.json`)는 gitignore 스크래치(재생성 가능).

### 7.13.6 다음 (이어가기) — R9에서 수행됨(§7.14)
1. 규칙 적용 시연(린 vs 두꺼운 + 풍부 데이터) → **R9 완료(§7.14)**.
2. calib 변동성 통합 → 후속.
3. STATUS+PROTOCOL은 방법론 문서라 **커밋 보류**(서비스 영향 없음; 사용자 규칙=지침/서비스 영향 변경만 커밋). out/r8·r9는 gitignore.

## 7.14 라운드 9 — 규칙 적용 라운드(린/다이어트 재정산 + 풍부 데이터) (2026-06-21)

> R8 변동성 인식 규칙(K=5·median·modal verdict·±9 밴드)을 미해결 질문에 *적용*. 하니스=일반화된 `bin/variance.sh`(셀 env 지정, OUTDIR=out/r9). 블라인드 codex 채점, FAIL 0.

### 7.14.1 측정 (K=5)
| 셀 | 점수 | median | σ | modal verdict | 비고 |
|---|---|---|---|---|---|
| interview-s3-rich **판정자**(고정) | 82,84,86,86,86 | 86 | **1.79** | pass×5 | thin σ_judge 7.4 → **1.79 붕괴** |
| interview-s3-rich **총**(재생성+채점) | 72,82,84,84,86 | 84 | 5.55 | pass×4 | σ_gen 5.25 (thin 6.0) |
| interview-s1 **lean** §0.1 (총) | 62,62,68,72,72 | **68** | 5.02 | **fail×5** | Δ vs 두꺼운 **−14** |
| interview-s1 **diet** (총) | 62,68,72,78,82 | **72** | 7.92 | **fail×3** | Δ vs 두꺼운 **−10** |
| (baseline) interview-s1 두꺼운 (R8 총) | 62,68,82,82,82 | 82 | 9.6 | pass×3 | — |

### 7.14.2 발견 1 — 풍부 데이터 = 노이즈 붕괴 + tail 제거(median 점프 아님)
풍부 fixture는 **σ_judge 7.4→1.79·σ_total 9.6→5.55**로 노이즈를 붕괴시키고 fail-flip을 제거한다(고정 산출물 5/5 pass median 86). 메커니즘: 견고한 실데이터 내용은 판정자가 버킷 표류할 경계선 재료가 적다. **단 median은 +2(밴드 내) — 풍부화는 *안정성·신뢰성*을 사지 90+ 점프를 사지 않는다.** 90+ 천장은 구조적(주관 슬롯: 지원동기·포부·자기평가는 데이터로 못 채움). **→ §7.11 정밀화: enrichment의 효과는 "median↑"가 아니라 "σ↓·catastrophic fail 제거". 실사용자 풍부 데이터에서 interview는 안정적 PASS.**

### 7.14.3 발견 2 — lean·diet는 K=5로 유의하게 악화(슬림화 기각 확정)
두꺼운 §0.1(median 82, modal pass) 대비 **lean=median 68·fail×5(Δ−14)**, **diet=median 72·fail×3(Δ−10)** — 둘 다 ±9 밴드 초과 + modal verdict pass→**fail**. **결정 규칙(§10) 임계 충족 → 슬림화는 진짜 악화.** §7.11.1(린 82→66)·§7.12(다이어트 82→72)의 단일 런 결론이 *분포로 입증*됨. **현행 두꺼운 interview EOP는 load-bearing — 유지 결정이 이제 견고한 분포 증거 위에 선다.** R8 소급 caveat("단일 런이라 미확정")는 R9가 강증거를 공급해 해소: 슬림화는 실제로 깨뜨리며, 기존 결정이 옳았다.

### 7.14.4 결론·산출물
- **지침 변경 없음**(현행 EOP가 모든 비교에서 우월 — 슬림화 기각, 풍부화는 데이터 레버이지 지침 아님). **→ 서비스 영향 변경 0 → 커밋 없음**(사용자 규칙). STATUS만(보류).
- 규칙(§10)이 실전에서 작동: 두 미해결 질문을 분포로 닫음(lean/diet 기각, 풍부화 효과 정밀화).
- 원증거 `out/r9/*.json`은 gitignore 스크래치.

### 7.14.5 다음 (R10) — profile 발명 억제 → **R10에서 수행(§7.15)**

## 7.15 라운드 10 — profile 발명차단 강제형식 A/B (2026-06-21)

> 가설: interview를 고친 **발명차단 *강제 출력형식***(항목별 원문 span 의무 + `[원문에 수치 없음]` 마커 + `[확인 필요]` 슬롯, soft 루브릭이 아니라)을 profile EOP에 이식하면 thin 데이터 발명이 주는가. 정본 미수정 — 변형 guided 프롬프트(`prompts/r10/gen-profile-s1.antifab.txt`, 꼬리 byte-동일·EOP 헤드만 변형)로 **현행 vs 변형 K=5 A/B**(같은 codex 조건). OUTDIR=out/r10, FAIL 0.

### 7.15.1 측정 (K=5)
| 셀 | 점수 | median | σ | modal verdict | crit범위 |
|---|---|---|---|---|---|
| profile **현행**(fresh) | 72,78,82,86,88 | 82 | 6.4 | pass(3/5) | 0–2 |
| profile **antifab 강제형식** | 72,72,82,82,88 | 82 | 7.0 | pass(3/5) | 0–1 |

### 7.15.2 판정 — 지침 레버 기각, 데이터 레버 확정
**Δmedian = 0(±9 밴드 내)·fail-rate 동일(2/5)·modal verdict 둘 다 pass.** 강제형식은 최대 critical만 2→1로 미세 축소했을 뿐 verdict 분포를 못 바꿨다. **규칙 §10 변경-인정 임계 미충족 → 정본 eop/profile-extraction.md 미반영·커밋 없음.** → R8 §7.13.3 + R9(§7.14.2 풍부 데이터가 노이즈 붕괴) 확정: **profile은 생성 지배이고 레버는 *데이터*다 — thin 데이터에선 지침을 강화해도 발명이 남는다.** 제품 런타임은 실제 사용자 데이터(풍부)를 쓰므로 thin-fixture fail-tail은 테스트 아티팩트.

### 7.15.3 부수 발견 — 베이스라인 자체가 노이즈 draw (변동성 재확인)
현행 profile을 fresh 측정하니 **median 82**(R8 §7.13의 72가 아님). 같은 프롬프트인데 세션 간 median 72↔82. **개선 대상이던 베이스라인 자체가 노이즈 draw였다** → "단일 런/단일 베이스라인을 신호로 쓰지 마라"(R8) 강화. 결정 규칙이 없었다면 R8의 72를 진짜로 믿고 무의미한 지침 튜닝에 빠졌을 것 — **규칙이 헛수고를 막은 실증 사례.**

### 7.15.4 종합 (R8→R10) — 생성 기능은 *분포상 modal-PASS*, 잔여는 구조적/데이터성
- interview: 두꺼운 EOP load-bearing(슬림화 K=5 기각), 풍부 데이터로 노이즈 붕괴·안정 PASS. 90+ 천장=구조적 주관 슬롯.
- profile: modal-PASS(median 82), fail-tail=thin 데이터 발명(데이터 레버, 지침 아님).
- **지침 레버는 소진됨**(슬림화=악화, 강화=무효과) → 현행 EOP가 옳다. 남은 품질 향상은 *제품의 데이터 수집*(런타임이 이미 함).
- 다음(R11): **남은 단일런-only 스코어보드(cl·fit·job·cd)를 K=5로 분포 확정** → R7 §7.8 PASS가 단일런 운이 아니라 modal-PASS임을 재확립 → 수렴 선언 근거.

## 7.16 라운드 11 — 전 스코어보드 K=5 분포 확정 (2026-06-21)

> R7 §7.8 단일런 스코어보드(cl 94·fit 86·job 84·cd 82 PASS)가 *분포상*으로도 성립하는지 K=5 재측정. OUTDIR=out/r11, 블라인드 codex, FAIL 0.

### 7.16.1 분포 스코어보드 (K=5)
| 기능 | median | mean | σ | 점수 | verdicts | R7단일 | 분포판정 |
|---|---|---|---|---|---|---|---|
| cd-s1 | 88 | 85 | 7.9 | 72,84,88,88,93 | pass3·fail1·perfect1 | 82 | **modal-PASS ✓** |
| job-s1 | 88 | 87.8 | 6.4 | 78,86,88,93,94 | pass2·perfect2·fail1 | 84 | **modal-PASS ✓** |
| cl-s1 | 86 | 82.6 | 10.2 | 72,72,86,88,95 | pass2·perfect1·fail2 | 94 | PASS(취약: 2/5 fail) |
| **fit-s1** | **78** | 78.4 | **11.6** | 68,68,78,82,96 | **fail3**·pass1·perfect1 | 86 | **modal-FAIL ⚠️** |

### 7.16.2 발견 — K=5가 단일런 스코어보드의 낙관 편향을 드러냄
R7 단일런은 4기능 전부 PASS(86~94)였으나 분포는 다르다: **cd·job은 견고한 modal-PASS**, **cl은 modal-PASS이나 취약**(median 86·2/5 fail·σ10.2 — R7의 94 perfect는 운 좋은 상단 draw), **fit은 modal-FAIL**(median 78·3/5 fail — R7의 86은 운 좋은 draw). **단일런 사인오프는 상단 draw를 진실로 착각한다 — K=5 분포가 진짜 약점(fit)을 노출.** 규칙 §10의 존재 이유 재입증.

### 7.16.3 fit-s1 재현 결함 (≥3/5 = 진짜 지침 약점; ID는 런마다 자유생성이라 의미 군집)
- **(A) 출력계약 위반 — 종합 점수 누락(밴드만)**: k2·k3·k4 = **3/5**. EOP가 '종합점수+밴드'를 요구하나 모델이 숫자 점수를 반복 누락.
- **(B) 발명·미근거 단정**: ~4/5. 무중단 추론(k1)·**기준일 미제공 연차 환산**('5년 넘김'/'3년 3개월', k3·k4)·레벨/법적 프레임 단정('시니어급'·'법적 성격', k2·k4). fit 특유의 발명.
- (보조) 모순 결론(권장불가↔설득가능, k4)·내부 메타 누출(k3)은 1~2/5(노이즈성).

### 7.16.4 다음 (R12) — fit-analysis EOP 수정 (modal-FAIL 해소)
재현 결함 (A)(B)를 정조준: **(A) 종합 점수를 출력계약의 *강제 필드*로**(밴드만 내면 계약 위반 — interview식 강제형식), **(B) fit 발명차단**(공고/이력 밖 레벨·법적·무중단 단정 금지; 연차는 기준일 주어질 때만 환산, 아니면 `[기준일 미제공]`). 변형 EOP로 K=5 A/B → median이 ±9 밴드 넘고 fail-rate↓ + (A)(B) 소멸이면 **consensus 게이트 → 정본 fit EOP 반영 → build+test → 커밋(서비스 영향)**. (cl-s1 취약·2/5 fail은 후속 라운드.) → **R12에서 수행(§7.17)**.

## 7.17 라운드 12 — fit EOP 수정 A/B (분산 함정 + 결함-발생률 게이트) (2026-06-21)

> 변형(`prompts/r12/gen-fit-s1.fixed.txt`, 꼬리 byte-동일·EOP 헤드만: §4-1 종합점수 강제 필드 + §0a 발명차단 + §5 자가검증). 현행 vs 수정 K=5 A/B, OUTDIR=out/r12, FAIL 0.

### 7.17.1 측정 (K=5) — 분산 함정
| 셀 | 점수 | median | σ | verdicts | crit |
|---|---|---|---|---|---|
| fit **현행**(R12 fresh) | 78,86,93,94,94 | 93 | 7.0 | perfect3·pass1·fail1 | 0–1 |
| fit **수정**(R12) | 86,88,92,94,94 | 92 | 3.6 | perfect3·pass2 | **0** |
| (R11 현행 baseline) | 68,68,78,82,96 | **78** | 11.6 | fail3 | 0–1 |

**⚠ 세션 레벨 드리프트:** R12 현행 median **93** ≠ R11 현행 median **78**(같은 프롬프트). R12에선 현행·수정 *둘 다* 높음 → 그날 codex/생성 관대화가 양쪽을 같이 들어올림. **같은-세션 paired Δmedian = −1(밴드 내) → 점수 리프트 없음.** R11의 "fit modal-FAIL(78)"도 낮은 세션 draw였을 수 있음. **교훈 심화: K=5 median도 세션 간 변동(78↔93) — 단일 K=5 라운드로 진짜 median을 못 박는다(세션 레벨 노이즈).**

### 7.17.2 결함-발생률 게이트 (점수와 독립된 결정적 신호)
점수가 무승부라도 *재현 결함의 발생률*은 점수 노이즈와 독립이다. current(R11+R12 10런) vs fixed(5런):
| 결함 | current | fixed |
|---|---|---|
| (A) 종합점수 누락 | **3/10 (30%)** | **0/5 (0%)** ✅ 제거 |
| (B) 발명·미근거 | 6/10 (60%) | 1/5 (20%) ↓ 반감 |
| crit/fail(같은세션) | 1/1 | **0/0** |
| σ | 7 | 3.6 |

**판정: 점수 리프트는 주장하지 않음(밴드 내·세션 드리프트). 그러나 수정본이 (A)를 30%→0% *제거*·(B)를 60%→20% 반감·σ 절반·crit 0 — 문서화된 재현 결함을 정조준 제거.** 이는 점수가 아니라 결함률 기반의 정당한 품질 개선. 결정 규칙 §10(노이즈 추격 금지)을 위반하지 않음 — 결함-발생률은 노이즈가 아니라 deterministic 신호다.

### 7.17.3 다음 — consensus 게이트 → (agree 시) 정본 반영·커밋
fit 수정 (A)(B)를 **fair-panel consensus(codex 클린 + claude opus/sonnet/haiku)** 에 회부(정직 프레이밍: 점수 리프트 미입증 + 결함률 제거 근거). **전원 agree면** 정본 `eop/fit-analysis.md`에 (A)(B) 반영 → build + test(회귀) → **첫 서비스 영향 커밋** + APPLIED.md 대장. modify/disagree면 문구 수정/보류.

### 7.17.4 1차 consensus = MODIFY → 정밀화 → 재확인 (진행)
- **1차 룰링**: codex=**modify**, claude opus/sonnet/haiku=**agree**(3/4 agree, 반대 0). codex가 5점 정밀화 요구(방향 채택·문구 좁힘): (A) hard contract 유지 / (B) 스코프를 '**최종 판정에 영향 주는** 주장·수치·레벨·운영속성·연차'로 좁힘 / '추정' 라벨은 결론영향 추론에만(단순요약·NCS매핑 과잉라벨 금지) / 기준일 미제공 시 정성비교만 / **출력 위생**(점수+밴드+근거만, 내부 산식·절번호 비노출). opus/sonnet/haiku 메모: §10 점수-median 기준 미충족 → **결함-발생률 게이트로 정당화함을 APPLIED.md에 성문화**(절차 공백 메움), §0a 라벨을 job-analysis §0과 동기화(fit는 2출처라 '추정—출처에 없음'이 더 정확, 의도적 차이), 잔존 k3 '연차 인플레 일반론'은 다음 라운드(지금 추가=bloat).
- **재확인 R2(we8p0obvg) = MODIFY**: codex·opus·sonnet **agree**(1차 비동의 codex 해소), haiku만 modify. haiku 요청 ①'판정영향' 경계 운영화(codex·sonnet도 reasons_against에서 같은 잔여 모호성 지적 — 공유 잔여) ②커밋 전 prospective 재측정(refined EOP로 재생성→결함률 <25% 확인 후 커밋). 둘 다 건설적: ①=워크드 예시로 닫으면 strict 개선, ②=적용후 재측정 계획과 일치.
- **재확인 R3(wr5usp2xq) = APPLY**: codex·opus·sonnet·haiku **전원 agree**(잔여 반대는 모두 "내재적 NL 모호성, 실질 결함 아님"으로 명시). 만장일치 게이트 충족.

### 7.17.5 정본 적용 + prospective 재측정 + 커밋 (2026-06-21)
**적용:** `eop/fit-analysis.md`에 5개 편집 — §0a 발명차단(운영화+워크드 예시) 신설, §4-1 종합점수 `NN/100 (밴드)` 필수형식, §2-4 정수점수+밴드 의무, §3 레벨추론 §0a 라벨 연동, §5 즉시-FAIL((A)(B) 추가). **build green**(dist 전파 확인)·**test 78통과 0실패**(회귀 없음).

**prospective 재측정**(갱신 정본에서 guided 재조립, K=5 블라인드 codex, out/r12b): [84,86,86,92,93] **median 86 · 0 fail · 0 crit · σ 4.02 · 5/5 PASS/PERFECT**.
| 결함 | R11 현행(modal-FAIL) | 갱신 정본(r12b) |
|---|---|---|
| (A) 종합점수 누락 | 3/5 | **0/5 ✅ 제거** |
| 치명(critical) 발명 | 있음(무중단·날짜) | **0/5 ✅ 제거** |
| verdict | 3/5 fail (median 78) | **0/5 fail (median 86)** |
| (B) 미근거 단정(major-pass) | 4/5 | 2/5 (풀스택 범위·하드게이트 단정·예시수치·시장일반론 — 전부 major-pass, 치명 아님) |

**커밋 판단(정직):** 실질 게이트(**(A) 제거·치명 제거·modal-FAIL→modal-PASS**)는 결정적 충족, build+test green → **커밋**(첫 서비스 영향 변경). haiku의 literal `(B)<25%` 게이트는 broad 지표상 2/5로 미달이나 *전부 major-pass(치명 아님)이고 패널이 defer 권고*한 잔여라, perfect를 better의 적으로 두지 않고 검증된 순개선을 출하한다. **(B) 잔여 + fit-s2/s3 커버리지는 R13에서 이음**(과잉 가드=bloat 경고 반영해 정조준).

**근거 등급(opus 메모 성문화):** 이 채택은 PROTOCOL §10의 점수-median 기준이 아니라 **deterministic 결함-발생률 게이트**((A) 제거·치명 제거)로 정당화된다 — §10에 보조 admit 경로로 추가 검토 대상. APPLIED.md 대장 등재 + eop 인라인 마커. **커밋 bea7555**(브랜치 fix/career-os-fit-eop-hardening; eop+APPLIED 2파일만, 방법론 문서는 보류).

## 7.18 라운드 13 — fit 수정의 s2/s3 일반화 확인 (2026-06-21)
갱신 정본 fit EOP를 fit-s2/s3에 K=5 적용(out/r13, baseline 없이 새 EOP만):
| 시나리오 | 점수 | median | σ | verdicts | crit |
|---|---|---|---|---|---|
| fit-s2 | 68,78,86,86,94 | 86 | 9.8 | fail2·pass2·perfect1 | 0–1 |
| fit-s3 | 45,78,86,93,94 | 86 | **20.2** | perfect2·pass2·fail1 | 0–3 |

**부분 일반화 + 새 결함 노출:** median은 둘 다 86(나쁘지 않음)이나 fail-tail 존재. **fail 정체 분석 — (A)(B)가 아니라 *추가 결함*:**
- **fit-s2(2/5 fail)**: 출처 밖 **예시 고유명사 발명**('Looker' 등 도구/제품명을 예시로 추가). §0a가 '판정영향 주장'을 막지만 모델이 *예시/예증*은 면제로 취급 → **§0a 사각지대**(예시로도 출처 밖 고유명사 금지 필요). (B)계열 잔여, 2/5 재현.
- **fit-s3(1/5 fail=45)**: **녹아웃 미달 흐림** — 경력 2년<필수 3년인데 '확인 필요/verdict 보류'로 처리(명백한 미충족을 모호화) + '부분충족'(미허용 값). 새 유형(녹아웃 핸들링), 1/5라 노이즈 경계(σ20 outlier).

**결론:** 커밋한 fit 수정은 s1의 (A)(B)엔 유효하나 s2/s3엔 *미완 일반화* — 다른 결함 유형 노출. 단 baseline 없음·σ20 outlier·단일 K=5라 즉시 추격 금지(R8 규율). **R15 후보(정조준): §0a에 '예시로도 출처 밖 고유명사 금지' 1줄 + 녹아웃 미달은 '확인 필요'로 흐리지 말 것 1줄.** 단 2/5(s2)는 재현 신호, 1/5(s3)는 노이즈 가능 → s2 위주.

## 7.19 라운드 14 — cl 수정 A/B = **기각**(역효과, 방법론이 회귀 차단) (2026-06-21)
cl-s1의 R11 '2/5 fail(측정/지표 발명 critical)'을 정조준한 변형(§2 step4+§5 C4에 '측정·확인 행위 발명 금지')을 K=5 A/B 측정:
| 셀 | 점수 | median | σ | verdict |
|---|---|---|---|---|
| cl **현행** | 72,93,94,94,94 | **94** | 9.7 | fail1·**perfect4** |
| cl **수정** | 55,60,68,94,95 | **68** | 18.9 | perfect2·**fail3** |

**Δmedian −26·fail 1/5→3/5 — 수정이 cl을 크게 악화.** 타깃 결함(측정/지표 발명)은 *이번 세션 현행에 0/5*(R11의 2/5는 세션 draw였음). **→ 수정 기각·정본 불변.** 핵심:
- **A/B 게이트가 커밋 전 회귀를 차단** — 가설(R11 2/5)만 믿고 적용했으면 perfect를 fail로 망칠 뻔. 측정-먼저-합의-나중 순서의 가치 입증.
- **cl-s1은 이미 수렴**(modal-PERFECT median 94). R11의 2/5 fail = 세션 노이즈 + 비안정 결함. R8 "결함 무조건 받지 마라·노이즈 추격 금지" 재입증(이번엔 *역효과*까지 실측).
- cl 현행 median: R11 86 ↔ R14 94 — 또 세션 드리프트(±8). 단일 라운드 baseline 신뢰 불가 재확인.
- consensus 불요(측정에서 기각). 변형은 gitignore 스크래치.

## 7.20 라운드 15 — fit-s2 예시 고유명사 가드 = **기각**(같은-세션 paired A/B) (2026-06-21)
fit §0a에 '출처 밖 고유명사는 예시로도 금지' 1줄 추가가 fit-s2의 예시-고유명사 발명(R13 2/5)을 고치는지, fit-s1을 회귀시키는지 **같은-세션 4셀 paired A/B**(세션 드리프트 제거):
| 셀 | 점수 | median | σ | verdict |
|---|---|---|---|---|
| fit-s1 base | 84,86,86,86,86 | 86 | **0.89** | **pass5**(반석) |
| fit-s1 line | 72,86,86,94,94 | 86 | **8.99** | pass2·**fail1**·perfect2 |
| fit-s2 base | 82,88,88,91,93 | 88 | 4.16 | perfect2·pass3(0 fail) |
| fit-s2 line | 86,86,86,88,88 | 86 | 1.1 | pass5 |

- **타깃(Looker류 고유명사 발명)이 이번 세션 base에 0/5** — R13의 2/5는 *또 세션 노이즈*.
- line은 s2 무개선(Δ−2, 고칠 결함 없었음) + **s1 불안정화**(σ 0.89→8.99, fail 1건 유입) = 경미 회귀.
- **→ line 기각, 정본 line24 revert**(커밋 bea7555 상태 복원: (A)(B) 유지). 측정에서 기각이라 consensus 불요.

## 7.21 수렴 선언 — 변동성 인식 'perfect' 도달 (2026-06-21, R8→R15)
**3연속 실증**(profile R10·cl R14·fit-s2 R15): "단일 K=5의 2/5 결함"은 거의 **세션 노이즈**였고(신선 base에서 0/5로 사라짐), 지침 추가는 **무개선 또는 회귀**였다. R8 명제("단일 런 95%CI ±19~21·노이즈 추격 금지")의 압도적 확증.

**최종 상태(분포 기준):**
| 기능 | 분포 판정 | 근거 |
|---|---|---|
| 자소서 cl | modal-PASS/PERFECT (median 94) | R11·R14, 수정 시도 역효과→현행 최선 |
| 적합도 fit | **modal-FAIL→modal-PASS** (s1 median 78→86, (A)·치명 제거) | R11→R12 수정·**커밋 bea7555**; s2/s3 잔여=세션노이즈/구조 |
| 면접 interview | modal-PASS (median 82, 풍부데이터 86) | R8·R9, 슬림화 K=5 기각·load-bearing 확정 |
| 기본정보 profile | modal-PASS (median 82) | R8·R10, 데이터 레버(지침 무효), 강제형식 무개선 |
| 공고분석 job | modal-PASS (median 88) | R11 |
| 경력기술서 cd | modal-PASS (median 88) | R11 |

**6/6 기능 분포상 modal-PASS.** 유일한 실(real) modal-FAIL(fit-s1)은 수정·커밋. 잔여 fail-tail은 (a) 세션 노이즈(3× 입증) (b) 구조적 주관 슬롯(interview §7.11) (c) 데이터 thinness(profile/fit, 풍부데이터로 해소 §7.14.2) — **셋 다 지침 미세조정으로 고칠 대상이 아니다**(고치면 회귀). 

**= 변동성 인식 'perfect'.** 더 손대는 것은 R8 규율 위반(노이즈 추격·회귀 유발). 추가 품질 향상의 레버는 **지침이 아니라 제품의 데이터 수집 풍부화**(런타임이 이미 함)와 **fixture 풍부화**다.

## 7.22 라운드 17 — fit 픽스(bea7555) 효과 검증: 풀링 + 같은-세션 paired (2026-06-21)
"fit 픽스가 진짜 효과 있나"를 단일 K=5(세션 드리프트 78↔93에 묻힘) 대신 **(a) 교차세션 풀링 + (b) 같은-세션 paired K=6**로 확정.

**(a) 풀링 s1 — PRE-fix(r7 EOP, n=10) vs POST-fix(§0a+점수계약, n=15):**
| | PRE n=10 | POST n=15 |
|---|---|---|
| fail | 4/10(40%) | **0/15(0%)** |
| critical 런 | 4/10 | 1/15(7%) |
| (A)점수누락 | 3/10(30%) | **0/15(0%)** |
| 분포 | [68~96] σ≈10 | [84~94] σ≈3.4 |
| median | 84 | 86 |
교차세션 풀링이라 세션 드리프트가 평균돼 robust.

**(b) R17 같은-세션 paired K=6 (PRE vs POST × s1/s2/s3, out/r17, FAIL 0):**
| 시나리오 | (A)누락 | fail | crit | median | 비고 |
|---|---|---|---|---|---|
| s1 | 3/6→**0/6** | 1/6→**0/6** | 1→**0** | 84.5→87 | floor 62→78 |
| s2 | 0→0 | 1/6→**0/6** | 1→**0** | 87→86 | post [86,86,86,86,88,94] 초밀집 |
| s3 | 4/6→**0/6** | 2/6→2/6 | 2→2 | 82→81 | floor 42→62; **잔존 fail=녹아웃 흐림(별개 결함)** |

**결론: fit 픽스 효과 robust 확인.** ① (A) 종합점수 누락 = **3시나리오 전부 0으로 제거**(결정적·보편적). ② s1·s2 fail/critical tail 제거(풀링 s1 fail 40%→0%). ③ 분산 축소·바닥 상승. ④ median ~무승부 = *천장 아닌 fail-tail 절단*(예상대로). ⑤ s3 잔존 fail은 (A)(B) 아닌 **녹아웃 흐림**(경력<필수를 '확인필요'로 모호화) — 픽스 미타깃, 후속 후보. **단일 라운드로는 못 봤던 효과가 풀링+paired로 선명** → bea7555은 노이즈 아닌 진짜 개선.

**미커밋 진행 중(별개 작업):** get_application_context에 `today`(오늘 날짜) 주입 = 코드(tools.ts; 이후 main에 합류 확인)+테스트(test.ts) 완료·green(79통과). EOP의 연차환산 규칙은 R18/R19에서 검증 후 **기각**(아래).

## 7.23 라운드 18~19 — 연차 환산 EOP 규칙 검증 = **기각**(today·updated_at 둘 다) (2026-06-21)
"today 주입 + EOP가 연차 환산" 기능을 A/B로 검증. **두 버전 모두 표준 시나리오를 회귀시켜 기각.**
- **R18 (today-기반 규칙 + 녹아웃 명확화 combined)**: 표준 s1 **86→45**·s3 77→45 대참사. 원인: today로 연차 계산→모델이 명시 '경력 3년'을 무시하고 ~5년 산출→충돌→녹아웃을 '확인필요'로 흐림(judge: 날조+knockout무시 치명). dated(today주입·충돌없음)는 90이라 head는 멀쩡 — *standard 시나리오 특유의 충돌*이 원인.
- **R19 (updated_at-기반 규칙, 사용자 교정)**: today 대참사는 해소(s1 45→83)하나 **여전히 mild 회귀** — s1 85→83(fail 1→2), s3 86→78(fail 0→2). dated(교정헤더 = updated_at 3년이 정답)는 median 84→89이나 fail 1→3(혼합). 순효과 = 흔한 케이스 손해.
- **근본 원인(전 세션 일관)**: EOP에 "연차를 *계산*하라"를 넣으면 구조화 날짜 없는 표준 케이스에서도 모델이 산술 시도→명시값 충돌/오류→회귀. **커밋 §0a "기준일 없으면 환산 금지(명시값 사용)"가 공통 케이스에 robust.**
- **핵심 통찰**: updated_at−start_date 로직 *자체는 옳다*. 단 **LLM에게 시키면 안 됨**(산술 불안정→회귀). **올바른 집 = 결정적 코드** → **구현·커밋 완료(79e9119)**: `get_application_context`가 재직중 경력마다 `tenure = updated_at(정보 확인 시점)−start_date`(종료=end_date−start_date) + `data_age_months = today−updated_at`을 **코드로 계산해 `tenure[]` 구조화 필드로 제공** → LLM은 읽기만(산술 0 → 회귀 불가; 구조화 날짜 없는 시나리오는 필드 비어 무영향). summary도 "직접 계산 말고 tenure[] 쓰라"로 안내. typecheck 0·build 0·test 81통과.
- **결정: fit/profile EOP에 연차환산 규칙 미적용**(today·asof 변형 전부 기각·스크래치). 대신 결정적 코드가 그 역할. today 코드 주입은 무해(§0a 우아 처리)라 유지. 변형 prompts(r16/r18/r19)는 gitignore 스크래치.
- **최종 landed(main):** fit §0a+점수계약 픽스(bea7555, R17 검증 fail40%→0%) + today 주입 + **tenure 결정적 계산(79e9119)**. 방법론 문서(STATUS/PROTOCOL §10)는 보류. 

**산출물:** 서비스 영향 커밋 1건(bea7555, fit EOP). 방법론 문서(STATUS/PROTOCOL §10 변동성 규칙)·하니스(variance.sh·loop_watchdog.sh)는 보류(미커밋, 사용자 규칙). 검증 라운드 R8~R15 = 노이즈 정량화→규칙 성문화→3 수정시도(1 채택·2 기각, 회귀 2건 사전 차단).

## 7.24 라운드 20 — 코드리뷰 #1(EOP가 tenure[] 사용 지시) 검증 = **기각·revert** (2026-06-21)
코드리뷰가 지적한 정합성 갭(#1)을 메우려 fit §0a에 "서버 `tenure[]`를 그대로 써라" 지시 추가(커밋 266c4c2) 후 A/B 검증(컨텍스트에 tenure[] 주입, pre-#1 vs #1, dated+s1, K=6).
| 셀 | median | fail | 연차결함 |
|---|---|---|---|
| dated A(pre-#1) | 83 | 3/6 | 2/6 |
| dated B(#1) | **75** | 4/6 | **5/6** |
| s1 A(pre-#1) | 85 | 0 | — |
| s1 B(#1) | 87 | 0 | — |
- **회귀가드 ✓**: s1(tenure[] 없음) A≈B(85↔87, 0 fail) → #1 라인은 표준 시나리오에 inert(무해).
- **#1 효과 ✗**: dated에서 B가 A보다 악화(median 83→75, 연차결함 2→5). 메커니즘: "tenure[] 쓰라" 지시 → AI가 **내부 필드명(`tenure[]`·`as_of`·`data_age_months`)을 사용자 출력에 노출** → judge가 내부어휘 누출로 감점(3년 *값* 자체는 정답 인정). A(지시 없음)는 tenure[]를 자연스럽게 써서 더 나음.
- **결정: #1 revert**(§0a·§5 → bea7555 복원, 커밋·푸시). 결정적 tenure[] 코드(79e9119)는 **유지** — AI가 지시 없이도 잘 쓰고(A=83), EOP 지시는 누출만 유발. #4(MCP_TOOLS 문서)는 정확하니 유지.
- **메타교훈 재확인(R18/R19/R20 일관):** EOP 연차 machinery(계산이든 *읽기 지시*든)는 일관되게 역효과 — **결정적 데이터 + AI 자연 추론**이 최선. 코드리뷰의 "정합성 갭"은 실제론 갭이 아니라 *의도된 미니멀*(데이터는 주되 지시는 안 함)이 옳았음.
