# APPLIED — 교차검증 수렴 결과의 정본 적용 대장

> 이 파일은 **어떤 결함이 어느 정본 지침에 언제·무슨 근거로 반영됐는지**를 추적한다.
> 목적: 다음 검증 라운드가 **이미 적용된 항목을 재검증하지 않도록** 한다. 정본 본문에는
> 같은 위치에 인라인 마커(`<!-- applied: <ID> / <날짜> -->`)를 달아 본문에서도 적용 여부가 보이게 한다.
>
> 방법론·근거 데이터: [STATUS.md](STATUS.md) · [PROTOCOL.md](PROTOCOL.md) · 원장 [`runs/ledger.jsonl`](runs/ledger.jsonl) · 룰링 [`runs/consensus/reconfirm-*.json`](runs/consensus/).

## 적용 대장

| 결함 ID | 시나리오(테스트 케이스) | 적용 문서/위치 | 적용일 | 근거(합의) |
|---|---|---|---|---|
| **C3 cl-marker** (critical) | cl-s1 (자소서) — 코드펜스 안/밖 경계가 모호해 "이 안만 붙여넣으세요"·글자수 같은 메타 문구가 제출 본문에 누출 | `eop/cover-letter.md` §4 ① (제출용 본문 블록 안=순수 자소서만, 메타/라벨은 블록 밖으로 물리적 분리) + §5 C3 루브릭(본문 블록에 메타 혼입을 C3로 명시) | 2026-06-18 | **reconfirm 4/4 agree** — codex·claude opus·sonnet·haiku 전원 `"ruling":"agree"` (`runs/consensus/reconfirm-p1-cl-marker.*.json`) |
| **C4 interview-why** | interview-s1/s2 (면접) — '왜/어떻게/어떤 순서로' 꼬리질문에서 의사결정 이유·측정 근거·진행 순서를 출처 없이 후보 행위로 귀속(confabulation) | `eop/interview-prep.md` §2 step5 (저장 데이터에 있으면 1인칭, 없으면 후보 판단으로 단정 말고 '면접 전 확인'으로 분리; 도메인 일반 원칙은 "일반적으로는~") + §0 (미확인 항목은 답변 본문이 아니라 '면접 전 확인' 섹션) | 2026-06-18 | **reconfirm 4/4 agree** (`runs/consensus/reconfirm-p2-interview-why.*.json`) |
| **profile-duty** | profile-s1/s2 (기본정보 추출) — 무정량 '진행/개선했습니다'를 achievement로 격상 | `eop/profile-extraction.md` §2 step4 (achievement는 명시적 outcome[완료·전환·수상·전후 변화 등]일 때만; 수치·결과 없는 수행/담당/참여/진행/개선은 responsibility) | 2026-06-18 | **reconfirm 4/4 agree** (`runs/consensus/reconfirm-p3-profile-duty.*.json`) |
| **r7-interview** (R7) | interview-s1/s2 (면접) — confabulation(없는 의사결정 이유·측정근거·순서·실패 일화·질문 텍스트의 미저장 고유명사를 후보 사실로 발명) 차단 | `eop/interview-prep.md` §0.1(발명차단 단일원본)·§0.1.1(3블록 템플릿)·§0.2(2-트랙 A 기술·실무/B 인성·컬처핏)·§4·§5 R10 | 2026-06-20 | **R7 블라인드 cross-vendor A/B(codex 클린룸 생성 + claude 채점)** interview-s1/s2=82/82 PASS·치명0(이전 58·12). consensus 패널 R1→R3 수렴(disagree 0). 산출물 수준 cross-vendor PASS 증거(reconfirm 전용 표결 아님). 커밋 2ca7480·b219531·c523c19 |
| **r7-cover-letter** (R7) | cl-s1/s2 (자소서) — 파생 정확수치(전후값 %·배수) 발명·채널/주체 재귀속('캠페인'→'인스타그램')·출처 밖 기간('입사 후 1~2년') 단정 차단 | `eop/cover-letter.md` §2 step2(연차 수치=일반 로드맵 골격일 때만)·§2 step4 프레이밍 경계(범위·채널·주체 그대로, 파생 정확수치 금지/정성표현만, 학습·기초의 수행 승격 금지)·§5 C4 | 2026-06-20 | **R7 cross-vendor PASS** — cl-s1 55→94 PERFECT(opus 생성·codex 채점)·치명0. consensus R1→R3 수렴. 커밋 ebc6275. FIXES.md P2·P3 정렬 |
| **r7-job-analysis** (R7) | job-s1 (공고분석) — 추론된 부재('ATS 미사용')를 추정 라벨 없이 단정·공고 밖 고유명사 발명·'70~80% 매치면 충분' 임계값 통과 단정 차단 | `eop/job-analysis.md` §0(부재 분리: 관찰 미기재 vs 추론된 부재=의무 '추정' 라벨; 커버리지%=맥락신호·게이트=하드요건 knockout; 공고 밖 고유명사 발명 금지) | 2026-06-20 | **R7 cross-vendor PASS** — job-s1 72→84 PASS·치명0. consensus R1→R3 수렴. 커밋 ebc6275. FIXES.md P3·P5 정렬 |
| **r7-career-description** (R7) | cd-s1/s2 (경력기술서) — 전사 보유 스킬을 미묶음 프로젝트 사용기술로 귀속·저장 전후값 비율/배수(약 30%·약 1.7배) 임의 환산·검토 메모 제출 본문 혼입 차단 | `eop/career-description.md` §3-6(도구·기술은 저장이 묶은 범위만)·§4(전후값 그대로·파생 비율/배수 환산 금지)·§7 C2 | 2026-06-20 | **R7 cross-vendor PASS** — cd-s1 62→82 PASS; cd-s2 92 PERFECT(헤더 교정 후). consensus R1→R3 수렴. 커밋 b83e485. FIXES.md P2 정렬 |
| **r12-fit-contract-invention** (R12) | fit-s1 (적합도판정) — ① 종합 점수 누락(밴드만 제시, 출력계약 위반) ② 발명·미근거 단정(레벨·법적·무중단 프레임, **기준일 미제공 연차 환산**) | `eop/fit-analysis.md` §0a(발명차단—판정영향 주장만 사실 span 앵커·라벨 필요/불요 워크드 예시·기준일 미제공 환산불가)·§4-1(종합점수 `NN/100 (밴드)` 필수형식)·§2-4(정수점수+밴드 의무)·§3(레벨추론 §0a 라벨)·§5(즉시-FAIL 추가) | 2026-06-21 | **결함-발생률 게이트**(§10 점수-median 아님): K=5 재현결함 (A) 3/5→**0/5**·치명발명→**0/5**·modal-FAIL(median 78)→**modal-PASS(86, 0 fail)**. consensus R1(codex modify)→R2→**R3 전원 agree**. prospective 재측정(out/r12b)·build+test green. 잔여 (B) major-pass 2/5는 R13 이월(패널 defer 권고) |

**합의 집계:** 3 결함 × 4 모델 = **12/12 reconfirm agree**. 원래 합의(`runs/consensus/p1~p3-*.json`)는 `"ruling":"modify"`(수정 권고) → 수정 문구를 반영한 뒤 재확인(`reconfirm-*`)에서 전원 `agree`로 확정.

**R7 batch (2026-06-20):** 위 4개 `r7-*` 행은 R7 생성기능 보정(린 구조 규칙·발명차단 출력형식)의 정본 등재다. **증거 등급이 옛 3건과 다르다** — 옛 3건은 결함-규칙 텍스트에 대한 *reconfirm 전용 표결(12/12 agree)*이지만, `r7-*`는 **블라인드 cross-vendor A/B 애블레이션(codex 클린룸 생성 + claude 채점)의 산출물 수준 PASS**(STATUS §7.8)다. 적용 문구는 fair-panel consensus(codex + claude opus/sonnet/haiku) **R1→R2→R3 수렴**(3라운드 84표 중 `disagree` 0; R3에서 codex·sonnet 7/7 `agree`, opus 4/7 `agree` + 잔여 modify는 패널이 지정한 wording polish를 반영)으로 정밀화했다. 이 세션의 consensus 워크플로우 3라운드가 룰링 원본이다.

## 직군 중립화 (2026-06-18)
검증과 별개로, 정본 예시가 개발/IT에 치우친 곳을 **예시는 보존하되 "직군 예시 중 하나"임을 명시**하도록 일반화. 결함 수정 의도는 보존.

| 위치 | 변경 |
|---|---|
| `eop/profile-extraction.md` §2 step4 | achievement/responsibility 예시를 IT 단독("배포 2시간→20분", "API 개선")에서 직군 중립("처리 시간 단축", "신규 거래처 전환", "고객 응대 프로세스 개선")으로 교체 |
| `eop/cover-letter.md` §2 step4(경계) | 프레이밍 경계 예시(p99·Kafka·A/B)가 IT 직군 한 예임을 명시 — 원리는 전 직군 동일 |
| `eop/interview-prep.md` §0 | '도메인 지식'의 예(격리수준·idempotency)가 직군별 전문 개념의 한 예임을 명시 |

## cross-vendor로 닫힌 항목 (2026-06-20 closed — 이력 보존)
아래 2건은 R6까지 claude 멀티모델 만장일치만 있고 codex 규칙-텍스트 전용 표결이 없어 '미완'이었으나, **2026-06-20 codex 규칙-텍스트 전용 표결에서 agree** 하여 닫혔다(consensus 하니스의 클린 codex 패널리스트 = cross-vendor). 4/4 agree.

| 항목 | 위치 | 상태 |
|---|---|---|
| P4 STAR 앵커-우선 | `eop/cover-letter.md` §2 step4 | ✅ **닫힘(2026-06-20)** — codex 규칙-텍스트 전용 표결 **agree**(4/4: codex + claude opus/sonnet/haiku) + claude 3모델 만장일치(2026-06-18) + R7 cross-vendor 산출물 PASS 간접지지(cl-s1=94 opus생성·codex채점 / cl-s2 codex생성 90 PASS) |
| 사실 앵커 경계(프레이밍) | `eop/cover-letter.md` §2 step4 | ✅ **닫힘(2026-06-20)** — codex 규칙-텍스트 전용 표결 **agree**(4/4) + claude 3모델 만장일치 + R7에서 `r7-cover-letter`가 경계 강화('범위·채널·주체 그대로'·파생수치 금지)해 cross-vendor PASS 간접지지 |
