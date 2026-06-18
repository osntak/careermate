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
