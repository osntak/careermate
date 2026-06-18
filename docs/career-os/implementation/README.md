# Career-OS / Phase B — 상태와 읽는 법 (먼저 읽기)

> 이 폴더(`implementation/`)는 Career-OS 지식층을 런타임에 연결하는 **설계 문서**다. 그중 **Phase B-1(serve + 라우팅)은 2026-06에 실제로 구현·배선되었고**, **Phase B-2(det 점수 계산·저장 게이트·마이그레이션)는 아직 미구현(제안 스펙)**이다. 문서가 B-2 요소(`validate_*`, `verifications` 테이블, `rejection_reviews`/`hard_gate` 컬럼 등)를 현재형으로 서술해도 "설계상 그렇게 하자"는 뜻이지 "이미 있다"는 뜻이 아니다.

## 헷갈리기 쉬운 점 — `knowledge`가 두 곳

| 경로 | 실재? | 무엇 |
|---|---|---|
| **`docs/career-os/knowledge/`** | ✅ 있음 | 16개 도메인 플레이북 + 6개 검증기 루브릭의 **실제 마크다운 콘텐츠**. npm에도 실린다. 런타임에 `get_playbook`/`get_verifier`가 **이 파일을 그대로 읽어 serve**한다(단일 출처). |
| **`packages/knowledge` (`@careermate/knowledge`)** | ⚠️ 있음(얇음) | 위 마크다운을 **읽어 serve하는 코드 패키지**. 단, 설계 문서가 말하는 "지식을 *구조화 데이터*(`EXPERT_PLAYBOOKS`/`VERIFIERS`/`SHARED_LEXICONS` const)로 담는" 풀 버전은 **아직 아니다** — B-1에서는 마크다운을 파일에서 읽어 돌려주는 얇은 형태로 구현했다. 구조화 데이터·`det` 계산은 B-2에서 필요해질 때 만든다. |

> 즉 설계 문서의 `packages/knowledge`(구조화 데이터 모듈)와 현재 코드의 `packages/knowledge`(마크다운 serve)는 **이름은 같지만 범위가 다르다.** 현재는 "지식을 AI에게 닿게 한다"는 B-1 목표만 충족하는 최소 형태다.

## 지금 실제로 런타임에 연결된 것 (B-1 — 구현됨)

연결된 AI가 **고아였던 전문가 지식을 실제로 받아 적용**하도록 다음을 배선했다:

- **`packages/knowledge`** (`@careermate/knowledge`) — `docs/career-os/{eop,knowledge}`의 마크다운을 읽어 serve(BUNDLED이면 `dist/career-os`, 소스면 `docs/career-os`). `getPlaybook`/`getVerifier`/`getEop` + `CAREER_ROUTES`/`renderRouteGuide`.
- **신규 MCP 도구** (`packages/mcp-tools/src/tools.ts`): `get_playbook({ domain })`(16), `get_verifier({ id })`(6). → 도구 총 31→33개.
- **기존 도구 확장**: `get_workflow_guide`가 작업별 **EOP 본문 + 적용할 플레이북/검증기 순서**(`career_route`)를 함께 반환. `get_application_context`가 `recommended_route`·`verifier_sequence`·`next_tool`를 주입.
- **소비 배선**: `packages/prompts/src/system.ts`에 원칙 #9(전문가 절차·저장 전 자가검증), `AGENTS.md` 같은 규칙, `apps/mcp/src/index.ts` server instructions에 verifier 경로 추가.
- **빌드**: `scripts/build-dist.mjs`가 `docs/career-os`(eop·knowledge만, implementation·validation 제외)를 `dist/career-os`로 복사.

검증: `typecheck` 통과, 기존 테스트 22/22 통과, 27개 지식 파일 serve 확인, 소스/번들 양 런타임에서 동작 확인.

## B-2 부분 구현됨 (2026-06-18 — 숫자 출처 게이트)

마이그레이션이 필요 없는 **결정론 검증의 핵심 슬라이스**를 먼저 구현·배선했다(`@careermate/core/verify`):

- **숫자·사실 출처 게이트(zero-ai, LLM 0):** 자소서 본문의 정량 수치를 사용자가 저장한 facts(이력서[비-ai source]·경력·프로젝트·스킬)와 대조한다. 같은 세그먼트·같은 단위 안에서의 파생(차이/합/비율/%변화)·반올림·NFKC/풀와이드/제로위드 정규화까지 처리하고, 근거 없는 수치(환각 의심)는 `save_cover_letter_version`에서 **저장을 차단**한다(`force:true`로 우회 시 "검증 미통과"로 정직히 표기). **소스 스코프 분리**(공고 수치는 지원자 성과 claim을 지지하지 못함)·**트러스트 필터**(ai 생성 문서는 출처 집합에서 제외)로 안티게이밍. (Codex gpt-5.5 교차검증 반영.)
- **`validate_cover_letter`(readOnly):** 저장 전 동일 점검을 차단 없이 미리보기.
- **문체 advisory:** 번역투·제너릭 도입·빈 형용사·블라인드 PII를 세어 신호로(차단 아님).
- 검증: `scripts/test-verify.ts`(20) + `scripts/test.ts` §6(5) + 라이브 MCP 게이트 동작 확인, typecheck·build·기존 e2e(27/27) 통과.

여전히 LLM이 없으므로 **비수치 사실·동문서답·의미 판단은 게이트 불가**(자기검증 위임). 게이트는 "허위 수치 차단 + 문체 advisory"까지이며 truthfulness 전체를 강제하지 않는다(정직).

## 아직 안 한 것 (B-2 나머지 — 후속, 미구현)

CONTRACT C0의 B-2 데이터모델·영속 계열이 남아 있다. **데이터 의존·마이그레이션이 필요해 분리**했다:

- `validate_*`/`check_traceability`/`check_staleness` 등 **det 계산 도구**(슬롭 밀도·키워드 커버리지·추적성 카운트).
- **save-time 게이트**(`gateableCheckIds` — 순수 `serverComputed`·`hard`만) + `verifications` 테이블.
- 데이터모델: `rejection_reviews` 테이블·`profile.hard_gate` 컬럼·`resume_content_hash`/`jd_hash`·enum 확장, `save_rejection_review`/`evaluate_offer`.
- 지식의 **구조화 데이터화**(`EXPERT_PLAYBOOKS`/`SHARED_LEXICONS` const)와 `get_shared_lexicons`/`get_fact_anchors`.

→ B-1은 "잘 보이는 신호등 + 자가검증 안내"까지이고, **실제 저장 차단(게이트)은 B-2뿐**이다(현재는 기존 `saveInterviewPrep` 상태 게이트만 강제).

## Phase 구분 (정본: [`CONTRACT.md`](CONTRACT.md) C0)

- **B-1 = serve + 라우팅 + 자가검증 안내** (마이그레이션 0·게이트 0) — **구현됨.**
- **B-2 = det 엔진 + 검증 게이트 + 영속** (마이그레이션 필요) — 후속.

## 설계 문서 상태 (2026-06)

- `CONTRACT.md`가 횡단 결정 단일 정본. `ARCHITECTURE`/`CONSUMPTION`/`TODO`/`KNOWLEDGE`/`EXPERTS`/`VERIFIERS`는 B-1/B-2 청사진. (단 `LOOP_ENGINE`/`CONSENSUS_ENGINE`/`EVALUATION`은 변두리·일부 미정이고, 일부 cross-link가 "미작성"으로 적혔으나 파일은 존재하는 내부 stale가 있다.)
- 품질 교차검증([`../validation/`](../validation/README.md)): R6에서 중단. "2-vendor 수렴"이며 "3-LLM 만장일치"가 아니다.

## 읽는 순서

[`CONTRACT.md`](CONTRACT.md)(정본) → [`ARCHITECTURE.md`](ARCHITECTURE.md)(패키지·컴포넌트) → [`CONSUMPTION.md`](CONSUMPTION.md)(B-1 소비 배선) → [`TODO.md`](TODO.md)(시퀀싱·데이터모델) → 나머지.
