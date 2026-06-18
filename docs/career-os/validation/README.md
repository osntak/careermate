# validation/ — Career-OS 교차검증 하니스 + 발견사실 (내부 방법론)

> **런타임 경로 아님.** 이 폴더는 정본 지침(`../eop/`·`../knowledge/`)이 전문가급 결과를 내는지
> **교차검증으로 단단하게 만드는 방법론·증거**다. 외부 LLM이 사용자 작업 중에 읽는 문서가 아니다.

## 문서 지도
- [MANDATE.md](MANDATE.md) — 핵심 지시(무엇을·왜). 컨텍스트가 압축돼도 보존되는 정본 의도.
- [PROTOCOL.md](PROTOCOL.md) — 교차 생성·평가 토너먼트의 실행 절차(L1 산출물 / L2 지침).
- [STATUS.md](STATUS.md) — 라운드 이력·현재 수렴 상태·다음 과제(이어가기용).
- [APPLIED.md](APPLIED.md) — 수렴된 수정이 **어느 정본 지침에 언제 반영됐는지** 적용 대장(재검증 방지).
- `research/` — 4편 보강 리서치(검증 출처). `runs/` — 실행 하니스·증거 원장.

## 검증으로 확정된 발견사실 (2026-06-18, 라운드 6 종료 기준)

### 1. 평가자 vendor 편향 — **최종 게이트는 cross-vendor 기준**
같은 산출물을 두 평가자(claude 계열 / codex)가 채점하면 점수가 한 방향으로 갈린다. 원장(`runs/ledger.jsonl`) 전수 집계:

- 평균: **claude 평가자 84.3 vs codex 평가자 77.4** (각 n=52).
- 동일 산출물 50쌍 직접 비교: **claude가 더 후한 경우 36 : codex가 더 후한 경우 13** (1 동점) — **한 방향**.
  claude-후함 36건 평균 **+15.3점**, 그중 claude가 *perfect*로 통과시킨 걸 codex가 *fail*시킨 사례 포함
  (예: cl-s1 claude 92 perfect vs codex 60 fail). codex-후함 13건은 전부 작은 차이(평균 −3.5, 이미 pass인 산출물의 노이즈).
- 질적으로 **claude 단독 평가는 마커 누출·수치 발명을 perfect로 통과**시키는 경향, **codex·sonnet이 그걸 잡았다**.

→ **규율:** 정본 지침 수정의 **최종 게이트는 cross-vendor(codex 포함) 기준**으로 둔다. **claude 단독 자기평가로 "완벽" 사인오프 금지.**

### 2. 평가자 변별력(calibration) 검증됨 — 점수 격차는 노이즈가 아니라 교정
의도적 불량 샘플(negatives)과 양호 샘플(good)을 양 평가자에 통과시킨 결과(`runs/calib/`):

- **불량 샘플: 6~20점, 전부 fail** (claude·codex 모두).
- **양호 샘플: 88~96점, 전부 pass** (claude pass / codex perfect).

→ 양 평가자 모두 좋은 것↔나쁜 것을 분명히 가른다. §1의 점수 격차는 **변별력 실패가 아니라 엄격도 교정(보정 대상)** 임을 뜻한다.

### 3. 한계 — **2-vendor 수렴**이지 "3-LLM 만장일치"가 아니다
- 실제로 돌아간 평가자는 **claude 계열(opus·sonnet·haiku) + codex의 2-vendor**다. **Gemini는 rate-limit으로 부재**.
- 따라서 이 작업의 수렴 상태는 **"2-vendor 교차검증 수렴"** 으로 표기한다. **"3-LLM 만장일치"로 단정하지 않는다.**
- **3-vendor(Gemini 포함) 확장은 후속 과제.** codex 재확인이 미완으로 남은 항목(`eop/cover-letter.md`의 P4·경계 인라인 주석, [APPLIED.md](APPLIED.md) 하단)도 vendor 재개 시 닫는다.

### 보조: 약한 모델(claude haiku) 우선순위
haiku 생성자는 지침대로도 clean 도달에 실패(7/7 fail)했다. 약한 모델 결과가 다른 모델과 과도하게 벌어지면
**지침 신뢰 신호로 쓰지 말고 우선순위를 낮춘다**(정보용·차단 아님). 평가자로서의 haiku 표결도 같은 가중.
