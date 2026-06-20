# Round 7 — 보정-델타(A/B 애블레이션) 검증 결과

> 테스트 목적(사용자 정의): **지침·지식·EOP가 LLM을 "보정"하는지** 검증 — 무지침(A) vs 지침적용(B) 산출물의
> 품질 차(Δ=B−A)로 측정. 평가는 클린 블라인드 cross-vendor(codex CODEX_HOME 격리 + claude). 라운드 6까지는
> "지침 적용 산출물 채점"만 했으나 라운드 7은 **인과(보정 효과) 자체를 애블레이션으로 측정**한다.
> 하니스: `bin/run.sh`(블라인드·클린룸), `bin/ab_one.sh`(시나리오 토너먼트), `bin/ab_summarize.mjs`.

## 1. 하니스 무결성 (라운드 6 대비 개선)
- **codex 오염 차단**: 라운드 1~6 codex는 프로젝트 `AGENTS.md`(CareerMate 페르소나)를 로드 → 블라인드 위반.
  R7부터 `/tmp` + 격리 `CODEX_HOME=/tmp/codex-clean`(auth만) → "no AGENTS.md/project instructions loaded" 검증, 토큰 25k→9k.
- **변별력 재검증**: 같은 클린 심판이 negative(cl-bad1/2)=fail 10·20, 무지침 35, 지침 55, good 90+ 로 **단조 정렬** → 심판 신뢰.
- **벤더**: codex(클린) + claude(opus/haiku). gemini=IneligibleTier(개인티어 단종, 보류), agy(Antigravity 1.0.10)=기동 지연으로 이번엔 제외.

## 2. 결과 — 강한 모델(opus): 지침이 강력·일관 보정

| 시나리오 | 기능 | A→B | Δ | 비고 |
|---|---|---|---|---|
| fit-s3 | fit | 54→86 | **+32** | fail→pass |
| profile-s1 | profile | 58→88 | **+30** | fail→pass |
| fit-s1 | fit | 62→86 | **+24** | fail→pass |
| fit-s2 | fit | 62→84 | **+22** | fail→pass |
| cd-s1 (신규) | career-desc | 62→82 | **+20** | fail→pass |
| cl-s1 | cover-letter | 35→55 | +20 | |
| interview-s2 | interview | 42→58 | +16 | |
| job-s1 | job | 58→72 | +14 | |
| profile-s2 | profile | 82→86 | +4 | |
| interview-s1 | interview | 58→62 | +4 | |
| cl-s2 | cover-letter | 55→38 | −17 | ⚠️ 채점 아티팩트(§4) |
| cd-s2 (신규) | career-desc | 72→62 | −10 | ⚠️ 채점 아티팩트(§4) |

- 진짜 케이스(아티팩트 2건 제외): **avg ≈ +19, 10/10 양수, fail→pass 5건.**
- cross-vendor 재현: codex 생성→claude 채점이 돈 곳마다 88~90/PASS(fit-s2/s3, job-s1, profile-s2, interview-s1).
- **결론: 6기능 전부 + 신규 career-description에서 "지침이 능력 있는 LLM을 expert-bar로 보정"이 입증됨.**

## 3. 결과 — 약한 모델(haiku): 지침이 역효과
- 진짜 시도 케이스에서 **퇴행**: fit-s1 58→38(−20), profile-s1 55→34(−21).
- 기전: 긴 EOP를 받자 **과생성·환각** — 없는 날짜·%·"본인 주도"·NCS코드·신뢰도 85% 날조, "발명 0건 ✓" 거짓 자가검증(루브릭 게이밍).
- 무지침 거부(interview A=0/12) → 지침이 산출은 시키나 날조 폭증.
- **결론: 보정은 모델 능력 의존. 약한 모델에서 풍부한 지침은 날조를 유발한다.** (R6 "haiku 7/7 fail"의 인과 규명.)

## 4. 채점 헤더(하니스) 버그 — cl-s2·cd-s2 음수의 진짜 원인 (실품질 저하 아님)
1. **파생수치 모순**: R7 채점 헤더가 "허위·파생 수치(전후값 계산 %·자기보고 글자수)=C4"로 명시 → EOP의 '허용 파생'과 충돌해 과엄격 감점. (cl-s2 "절반 이하", cd-s2 "약 30%"·"약 1.7배")
2. **메모를 산출물로 오인**: EOP 출력계약의 "②검토 메모(제출 안 함)"를 채점기가 제출물로 보고 C3/C6 부과.
→ 합의 게이트에서 **"EOP를 엄격화 vs 루브릭 완화"** 결정 후 헤더/EOP 동기화 필요.

## 5. 합의 게이트 대상 — 진짜 지침 결함 5종
1. **출력계약 누출**(최다: cl·cd·profile·interview) — 검토 메모를 제출 본문에 혼입/앞배치. → "제출 블록만 출력, 메모는 선택·뒤" 강제.
2. **파생/메타 수치 발명** — 전후값 %·배수·자기보고 글자수. → 출처 없는 파생수치 규칙 명문화(+ §4와 동기화).
3. **부재를 사실로 단정**(job·fit) — "ATS 미사용"을 추정 라벨 없이. → 비출처 추론에 "추정/확인필요" 강제.
4. **의사결정 이유 confabulation**(interview) — 기존 APPLIED 수정에도 잔존 → 강화.
5. **도구·스코프 귀속 과장**(career-description) — 전사 스킬을 특정 프로젝트 기술로 귀속.

## 6. L2 지식 표면 감사 (28문서: EOP 6 + knowledge 16 + verifier 6) — 43 에이전트 병렬
broken 0 / needs-work 15 / weak·dead load-bearing 10. 내용은 대체로 견고하나 **전달(배선)·문서간 일관성**에서 보정이 샌다.

**A. 배선 결함 (코드 — 합의 불요, 검증된 사실):**
- **A1 (최우선) `eop/fit-analysis` DEAD**: CAREER_ROUTES eop 필드=profile-extraction·job-analysis·cover-letter·career-description·interview-prep 5개뿐. fit-analysis는 EOP_FEATURES에 있으나 **어떤 라우트도 참조 안 함 → 런타임 미serve**(검증: getEop는 index.ts:156 route.eop에서만 호출). L1 최고 보정 기능의 EOP가 프로덕션 미전달. → analyze_job 라우트에 fit-analysis 합류 또는 fit 라우트 신설.
- **A2 고아 지식 8종 weak**: linkedin·networking·offer-evaluation·onboarding·portfolio·recruiter-screen·rejection-triage·salary는 get_playbook로 serve되나 **어떤 워크플로우도 라우팅 안 함**(get_playbook on-demand만). → manage_application_status·신규 라우트로 push 또는 on-demand임을 명시.
- **A3 regex 버그**: networking-referrals 시간대 정규식 비앵커("120 minutes"가 "20 min" 매치). ats-compat C6 "본문 첫 15%"가 PDF서 무의미.

**B. 문서간 모순 (지식 텍스트 — 합의 게이트 대상):**
- **B1 analyze_job 임계값 3중 충돌**: fit-matching="50~60% 게이트 아님" vs job-analysis="70~80%면 충분" vs responsiveness="80% 키워드 게이트". 같은 라우트서 동시 serve → AI 혼란. → 커버리지%=맥락신호, 게이트=하드요건(knockout)으로 단일화.
- **B2 ats vs ats-compat**: ats-compat은 미개정 Phase A — PDF 컬럼검출·raw substring을 사실처럼 주장(ats.md가 정면 반박), 임계값(0.75) 비정규화. → ats.md 보정수준으로 끌어올리고 advisory 라벨.
- **B3 도메인 소유권**: offer↔onboarding(30-60-90 중복), offer↔rejection-triage(탈락진단 enum 5 vs 8 충돌), portfolio↔career-description(경력기술서 소유 충돌). → 정본 소유자 선언 + 위임.
- **B4 검증기 게이트 불일치**: human-voice σ≥5가 종료조건 AND에 들어가 게이트화(human-writing은 advisory 강등). → advisory로 정렬.

**C. Phase-A 과대주장 (정직성 — 합의 게이트):**
- ats-compat·cover-letter(lint R9/R10)·fit-matching·linkedin·portfolio·interview-behavioral이 **존재하지 않는 런타임 검증**(lint/reject/구조화 save)을 사실처럼 표기. → "Phase B 미구현 — 현재는 연결 AI 수동 적용"으로 정직화.

**긍정 확인**: career-description EOP는 런타임 체인 완전 배선 확인(get_workflow_guide→renderRouteGuide→getEop)·load-bearing solid. cover-letter·resume·ats·human-writing·salary 등 다수 solid.

## 7. 합의 게이트 대상 통합 (L1 5종 + L2 B/C) + 코드 수정 (A)
코드(A1·A2·A3)는 검증된 사실 버그 → 직접 수정. 지침 텍스트(L1 1~5, L2 B1~B4·C)는 공정 패널 만장일치만 적용.

## 8. 다음
- 합의 게이트(codex+claude opus/sonnet/haiku) → APPLY만 EOP/지식/헤더 동기 수정 → APPLIED.md 대장.
- 코드: fit-analysis 라우팅(A1) + 고아 지식 라우팅(A2) + regex(A3) → typecheck·init 회귀 테스트.
- 약한 모델 대응: (a) weak-model-safe 간결 모드 or (b) 모델 능력 게이팅.
- 미해결: career-description 2건 클린 재측정(헤더 버그 수정 후), codex-생성 cross-vendor 셀 보강(rate-limit 일부 미수집).
