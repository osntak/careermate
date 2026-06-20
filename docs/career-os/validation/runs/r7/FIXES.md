# Round 7 — 수정 적용 스펙 (합의 패널 정밀화 반영)

> 합의 게이트 1차(codex+claude opus/sonnet/haiku) 결과: **8건 전부 MODIFY**(반대 0). 패널이 스코프·증거·문구를
> 정밀화함. 아래는 그 정밀화를 반영한 적용 스펙. 적용 전 **재확인(reconfirm) 라운드**로 만장일치 agree 확인 후
> 정본 수정 + APPLIED.md 대장 + 본문 인라인 마커. 코드(A)는 검증된 사실 버그라 합의 불요(완료/진행).

## 코드 수정 (합의 불요)
- **A1 ✅ 완료**: `analyze_job` 라우트가 fit-analysis EOP도 serve(eop 배열화). packages/knowledge/src/index.ts. typecheck 0.
- **A2 ✅ 완료**: `manage_application_status` 라우트 신설(rejection-triage·offer-evaluation·salary-negotiation) + prepare_interview에 recruiter-screen 추가. 고아 지식 8→4 감소. typecheck 0.
- **A3 ⏳**: networking-referrals 시간대 regex 비앵커 버그(`120 minutes`가 `20 min` 매치) + 15-30분 본문 불일치 → 리서치 보강에 포함.
- **남은 고아(후속 워크플로우 필요)**: linkedin-profile·portfolio·networking-referrals·onboarding-first-90-days는 새 워크플로우 id가 필요(get_workflow_guide enum + definitions.ts) — 별도 작업.

## 지침 텍스트 수정 (재확인 후 적용)

### P1 출력계약 — **재구성**(패널 정정)
- 패널 정정: '메모 혼입/앞배치'는 실측 미재현(opus가 cl-s1 haiku의 메모 분리를 *강점*으로 평가). 진짜 결함 = **내부 어휘 누출**(역량 enum 태그·도구명·EOP 절번호·`## DONE`·파일경로)이 interview-s1·job-s1·profile-s1에서 재현.
- 스코프: **profile-extraction §4 + interview-prep §4**(출력 순서 ①제출본문 ②검토메모-뒤 명시). cover-letter §4는 이미 C3로 커버 → 가드 1줄만.
- 가드 통일안: "산출물만 출력하라. 작성 과정·루브릭·EOP 절번호·프레임워크·내부 분류 어휘(역량 enum·도구명·파일경로·`## DONE`)를 산출물 본문에 노출하지 마라. 검토 메모는 제출 블록 **뒤** 별도 섹션(기본 제공 유지, 발명금지·미싱인포 질문 등 안전항목 생략 금지)."
- EOP 본문이 직접 인쇄하는 도구명(add_resume 등)을 '적절한 저장 도구로'식 일반표현으로.
- ※ C4 발명은 이 항목 범위 밖 → P4 + 신규 발명-하드닝(아래).

### P2 파생/메타 수치 — **스코프 한정 + EOP·헤더 동기**(패널: 한 곳 미합의)
- 스코프: **cover-letter + career-description만**(fit/profile 헤더엔 '전후값=C4' 줄 없음 → 제외).
- (A) 파생 수치 규칙: 출처에 없는 **중간지표·채널 귀속·측정행위 수치**와 **자기보고 글자수**는 제출 본문 금지(글자수→메모). 출처 양끝값에 앵커한 **정성 표현**('절반 이하')은 허용.
- ⚠ **미합의 1점(재확인 필요)**: 양끝값 산술 재표현(320→1,150을 '약 3.6배')을 허용(sonnet)할지 금지(codex)할지. → 재확인에서 단일 규칙 제시: "양끝값 직접 산술 재표현은 허용하되, 출처가 프레이밍하지 않은 새 지표·% 단정은 금지"로 수렴 시도.
- (B) 채점 동기화: eval-header가 ①허용 정성/산술 재표현을 C4로 감점 금지, ②**제출 안 하는 검토 메모는 채점 대상 제외**(C3/C6 부과 금지). EOP 본문(cover-letter §2-4·§5 C4, career-description §4·§7 C2)에도 같은 경계 명문화(헤더↔EOP 동일선).

### P3 부재→추정 라벨 — **확인가능/추론 분리**
- (a) 텍스트로 직접 관찰되는 미기재/미공개(예: 급여 '면접 후 협의', 근무지 '추후 안내')는 관찰 사실로 기술. (b) **추론된 부재**(ATS 미사용·1인 전담·온보딩 없음)는 반드시 '추정 — 공고에 언급 없음' 라벨 + 관찰 근거 + 불확실성. 부재-추론만 의무 라벨.
- 적용: **job-analysis EOP §0 + fit-matching 원칙 + fit-analysis EOP**(haiku 제안).

### P4 면접 confabulation·절차수치 — **2갈래**
- (1) EOP 자체 절차 수치 격리/비수치화: step1 '6~10개'→'핵심 경험 넓게', step4 '60~90초'·Q4 '45분→8/5/10/7/15'·step5 수치를 답변 본문 밖 가이드로. (모델이 절차수치를 후보 사실처럼 echo하는 것 차단)
- (2) step5 강화: 앵커 사실만(1인칭 과거형은 출처 필드 인용), 누락은 '면접 전 확인' 분리, 시나리오 밖 상황·STAR Result 발명 금지.
- (3) '숨길 것'에 역량 enum 태그 추가 + 역량은 평이한 한국어로(주도성·데이터 기반 판단).

### P5 analyze_job 임계값 단일화
- job-analysis §2 line9 '핵심 요건 70~80% 매치면 충분'→ "커버리지/충족 %는 맥락 신호일 뿐 권장 게이트가 아니다 — 권장 게이트는 하드요건(knockout) 충족(판정은 fit-matching/fit-analysis)." 앞 절(위치·반복 우선순위)은 보존.
- fit-matching·responsiveness-on-target에 1줄 경계: 충족률(분모=must-have)과 키워드 커버리지(별도 축·경고)는 측정 대상·역할이 다름.

### P6 ats-compat ↔ ats.md 정렬
- PDF 컬럼검출=신뢰불가/경고 강등, raw substring 단독매칭 금지(어형·동의어=외부 AI 입력 advisory), 벤더 편향·effect size 미검증 고지, 임계값 advisory.
- ⚠ **임계 숫자 결정**(opus): ats.md R4 0.70으로 통일 vs ats-compat 0.75(Jobscan 근거) 유지 — 한쪽 택해 사유 주석. 불일치 방치 금지.
- 파일형식 경계: .docx=w:tbl/w:txbxContent 신뢰, PDF=본문 매치만. (동반: ats.md R1 셀 문구 대칭화.)

### P7 도메인 소유권 — 링크 위임(값 복제 금지)
- 탈락 진단·재지원=**rejection-triage-iteration 단독**(정본 8-stage enum), offer는 링크. 30-60-90=**onboarding-first-90-days**(offer는 수락 직전 결정만). 경력기술서 정본=resume/eop-career-description(portfolio 위임). 보조 문서는 정본으로 링크/짧은 요약만.

### P8 Phase-A 과대주장 정직화 — **항목별 구현 확인 후**
- 일괄 치환 금지(codex). 각 문구의 실제 구현 상태 확인 후 정직화. 주 대상: **fit-matching R2/R3/R6 '(서버 검증 가능)'·save_fit_analysis 서버 재계산**(스키마에 필드 없음) → 'Phase B — 현재 연결 AI 수동'. cover-letter lint R9/R10, linkedin/portfolio lint, interview-behavioral 구조화 저장도 각각 확인 후 'advisory vs guarantee' 모호성 제거.

## 신규(L1 발견, 합의 추가 필요)
- **C4 발명 하드닝**: L1 최대 잔여 결함은 '발명'(없는 의사결정 이유·도구·원인·기간·후속 성과·지표). P4(면접)·P3(부재)와 별개로 전 기능 공통 '저장 데이터 밖 사실 단정 금지 + 미앵커 시 질문화'를 강화. → 재확인 패널에 추가 제안.
- **약한 모델 대응**: haiku가 풍부한 EOP에 과생성/환각 → (a) 모델 능력 게이팅 안내 or (b) weak-model-safe 간결 모드. → 설계 논의.

## 다음
1. 리서치 보강(권위 출처) 수신 → enrichment를 위 항목과 통합.
2. 재확인 패널(정밀화 제안 + C4 하드닝) → 만장일치 agree만 적용.
3. 정본 수정 + APPLIED.md + 인라인 마커.
4. 저점수 시나리오(interview·cl-s1·job + cd 재측정) A/B 재측정 → B가 PASS 도달 확인.
5. STATUS.md 라운드7 갱신 + 커밋 결정.
