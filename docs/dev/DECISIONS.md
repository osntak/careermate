# 설계 결정 기록 (ADR)

이 문서는 CareerMate의 주요 설계 결정을 맥락/결정/결과 형식으로 기록한다. 모든 결정은
**2026-06-14** 기준이며, 각 항목은 "왜 그렇게 정했는가"를 함께 남겨 이후 변경 시 근거를
재추적할 수 있게 한다.

관련 문서: [README](../../README.md), [아키텍처](./ARCHITECTURE.md)(보안 경계 포함), [데이터 모델](./DATA_MODEL.md), [MCP 도구](../MCP_TOOLS.md)

> 표기: 결정은 코드/설정과 일치해야 한다. 본문의 사실은 `package.json`,
> `packages/db/src/connection.ts`, `scripts/run.mjs` 등 실제 소스를 근거로 한다.

---

## 결정 목록 요약

| # | 결정 | 날짜 | 상태 |
|---|------|------|------|
| 1 | `node:sqlite` 내장 드라이버 사용 | 2026-06-14 | 채택 |
| 2 | `tsx` 기반 무빌드 실행 | 2026-06-14 | 채택 |
| 3 | 대시보드는 프레임워크/CDN 없는 바닐라 JS + 자체 CSS | 2026-06-14 | 채택 |
| 4 | MCP-우선 · LLM 비내장 | 2026-06-14 | 채택 |
| 5 | 로컬-우선 보안 모델 | 2026-06-14 | 채택 |
| 6 | 대시보드와 MCP가 동일 SQLite 공유(WAL) + `server.json` 핸드셰이크 | 2026-06-14 | 채택 |
| 7 | 자소서 버전관리 모델 | 2026-06-14 | 채택 |
| 8 | 순수 Node 러너(`run.mjs`) + stdout verdict 우회 | 2026-06-14 | 채택 |

---

## 1. `node:sqlite` 내장 드라이버 사용 (네이티브 컴파일 회피)

- **날짜**: 2026-06-14

### 맥락
CareerMate는 비개발자 사용자가 직접 설치하는 로컬 도구다. `better-sqlite3` 같은 인기
드라이버는 네이티브 애드온을 빌드/리빌드해야 하며, 이는 `node-gyp`, Python, C/C++ 빌드
툴체인(특히 Windows의 Visual Studio Build Tools)을 요구한다. 이런 전제는 "비개발자가
`npm install` 한 번으로 끝낸다"는 목표와 정면으로 충돌한다.

### 결정
Node.js에 내장된 `node:sqlite`(`DatabaseSync`)를 사용한다. 별도 네이티브 패키지 의존을
두지 않는다. 따라서 `package.json`의 런타임 의존성은 **네이티브 SQLite 드라이버를 포함하지 않으며**
(SQLite는 `node:sqlite` 표준 라이브러리로 동작), 런타임 의존성은 MCP SDK·`zod`·`tsx`와
`read_document`용 순수 JS 문서 추출 라이브러리(`mammoth`·`hwp.js`·`fflate`·`pdfjs-dist`)다.
`engines.node`는 `>=22.5.0`으로 고정해 `node:sqlite`가 보장되는 런타임을 강제한다.

연결은 `packages/db/src/connection.ts`의 단일 진입점(`getDb()`)에서 생성하며, 연결 직후
다음 PRAGMA를 적용한다.

```ts
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');
```

### 결과
- 설치 경로에서 네이티브 컴파일이 사라져 OS/아키텍처에 무관하게 `npm install`이 단순해졌다.
- 빌드 툴체인 부재로 인한 설치 실패 클래스가 통째로 제거됐다.
- 트레이드오프: Node 22.5.0 이상이 필수다. 구버전 Node 사용자는 업그레이드해야 한다.
- `DatabaseSync`는 동기 API이므로 DB 호출 패턴이 단순해지는 대신, 비동기 풀링 같은 고급
  패턴은 사용하지 않는다(로컬 단일 사용자 규모에서는 충분).

---

## 2. `tsx` 기반 무빌드 실행

- **날짜**: 2026-06-14

### 맥락
TypeScript를 쓰되 사용자에게 "빌드 단계"를 강요하지 않으려 했다. 별도 컴파일 산출물
(`dist/`)을 만들고 배포하는 흐름은 설치/실행을 복잡하게 하고, 소스와 산출물 불일치
같은 상태 오류를 유발한다.

### 결정
소스(`.ts`)를 빌드 없이 그대로 실행한다. Node에 `--import tsx`를 얹어 TypeScript를
런타임에 트랜스파일한다. `package.json` 스크립트는 모두 이 형태다.

```json
"start":   "node --no-warnings --experimental-sqlite --import tsx apps/web/src/index.ts",
"dev":     "node --no-warnings --experimental-sqlite --watch --import tsx apps/web/src/index.ts",
"mcp":     "node --no-warnings --experimental-sqlite --import tsx apps/mcp/src/index.ts",
"migrate": "node --no-warnings --experimental-sqlite --import tsx scripts/migrate.ts",
"seed":    "node --no-warnings --experimental-sqlite --import tsx scripts/seed.ts",
"doctor":  "node --no-warnings --experimental-sqlite --import tsx scripts/doctor.ts"
```

타입 검증은 실행과 분리해 `typecheck`(`tsc --noEmit`)로만 수행한다. 즉 `tsc`는 산출물을
내지 않고 타입만 본다.

### 결과
- `npm install` 후 곧바로 `npm start`로 실행된다. 별도 빌드 단계가 없다.
- `dev`는 `--watch`로 파일 변경 시 자동 재시작한다.
- 빌드 산출물/소스 불일치 문제가 원천적으로 없다.
- 트레이드오프: 런타임 트랜스파일 비용(시작 시점 오버헤드)이 있으나 로컬 도구 규모에서는
  무시 가능하다. 또한 ESM 전용(`"type": "module"`)으로 일관한다.

---

## 3. 대시보드는 프레임워크/CDN 없는 바닐라 JS + 자체 CSS

- **날짜**: 2026-06-14

### 맥락
대시보드는 완전 로컬·오프라인 환경에서 동작해야 한다. React/Vue 같은 SPA 프레임워크나
CDN 의존은 (1) 네트워크 요청을 유발해 오프라인/프라이버시 원칙을 깨고, (2) 빌드 파이프라인을
끌고 들어오며, (3) 보일러플레이트성 "슬롭(slop)" 코드를 양산한다.

### 결정
대시보드를 프레임워크 없이 바닐라 JavaScript로 작성하고, 외부 CDN을 일절 참조하지 않는다.
스타일은 서드파티 CSS 라이브러리 대신 자체 CSS 디자인 시스템으로 구성한다. 모든 정적
자산은 로컬에서 서빙되며 외부로 나가는 요청이 없다.

### 결과
- 인터넷 연결 없이 대시보드가 완전히 동작한다(오프라인 보장).
- 외부 요청이 없어 사용자 데이터가 로컬을 벗어나지 않는다(프라이버시 보장).
- 프런트엔드 빌드 단계가 불필요해 결정 2(무빌드)와 일관된다.
- 트레이드오프: 프레임워크가 제공하는 라우팅/상태관리/컴포넌트 추상을 직접 구현해야 하며,
  7개 페이지(Home, Profile, Jobs, Applications, Documents, Interview, Settings)와
  다크모드를 손으로 관리한다. 규모가 제한적이라 감당 가능한 비용으로 판단했다.

---

## 4. MCP-우선 · LLM 비내장 (분석은 사용자 AI가 수행)

- **날짜**: 2026-06-14

### 맥락
커리어 분석/자소서 작성 같은 작업은 강력한 LLM이 필요하다. 그러나 CareerMate가 자체
LLM을 내장하면 (1) API 키/비용/모델 선택을 사용자에게 떠넘기고, (2) 데이터를 외부
모델 제공자로 보내 프라이버시를 해치며, (3) 도구가 무거워진다.

### 결정
CareerMate 내부에는 LLM을 두지 않는다. 대신 MCP(Model Context Protocol) 서버로서
로컬 커리어 DB에 대한 **도구**만 노출한다. 사용자는 자신이 이미 쓰는 ChatGPT/Claude/Gemini와
대화하고, 그 AI가 CareerMate의 MCP 도구를 호출해 로컬 DB를 읽고 쓴다. 분석·작성 같은
지능 작업은 전적으로 사용자의 AI가 담당하고, CareerMate는 구조화된 데이터와 워크플로
가이드를 제공한다. 의존성으로 `@modelcontextprotocol/sdk`를 채택하고, MCP 서버는
`npm run mcp`(`apps/mcp/src/index.ts`)로 stdio 기동한다.

### 결과
- CareerMate는 LLM 비용/키 관리에서 자유롭다. 사용자는 이미 가진 AI 구독을 그대로 쓴다.
- 데이터 흐름의 통제권이 사용자에게 있다(어떤 AI를 쓸지 사용자가 선택).
- "인터페이스 = 대화, 저장소 = 로컬 DB"라는 역할 분리가 명확하다.
- 트레이드오프: CareerMate 단독으로는 분석을 못 한다. MCP를 지원하는 AI 클라이언트가
  전제된다. 도구 표면(37개 MCP 도구)과 워크플로 가이드 설계가 제품 품질의 핵심이 된다.

---

## 5. 로컬-우선 보안 모델

- **날짜**: 2026-06-14

### 맥락
대시보드는 로컬 HTTP 서버를 띄운다. 로컬 서버라도 브라우저를 통한 공격면(DNS 리바인딩,
CSRF, 악성 Origin, 경로 traversal)이 존재한다. 또한 이력서/자소서 본문 같은 민감
데이터가 로그나 에러 응답으로 새지 않아야 한다.

### 결정
다음을 모두 적용한다.

- **127.0.0.1 전용 바인딩**: 외부 인터페이스에 노출하지 않는다.
- **Host 허용목록**: 허용된 Host 헤더만 처리해 DNS 리바인딩을 차단한다.
- **CSRF 세션 토큰**: 변경 요청은 세션 토큰을 요구하며, 토큰은 HTML `<meta>`로 주입한다.
- **외부 Origin 차단**: 허용되지 않은 Origin의 요청을 거부한다.
- **정적파일 경로 traversal 차단**: 정적 자산 서빙에서 경로 이탈을 막는다.
- **8MB 본문 제한**: 과도한 요청 본문을 거부한다.
- **민감 본문 미노출**: 이력서/자소서 본문은 로그와 에러 응답에 포함하지 않는다.

### 결과
- 로컬 도구이면서도 브라우저 기반 공격면을 체계적으로 줄였다.
- 민감 데이터가 운영 로그/에러 메시지로 유출되지 않는다.
- 트레이드오프: 변경 요청에 CSRF 토큰 흐름이 필요해 클라이언트 호출이 조금 더 엄격해진다.
  자세한 위협 모델과 구현은 [ARCHITECTURE.md의 "보안 경계" 절](./ARCHITECTURE.md#5-보안-경계) 참조.

---

## 6. 대시보드와 MCP가 동일 SQLite 공유(WAL) + `server.json` 핸드셰이크

- **날짜**: 2026-06-14

### 맥락
대시보드(웹 서버 프로세스)와 MCP 서버(stdio 프로세스)는 별개 프로세스이지만 같은 커리어
데이터를 봐야 한다. 사용자는 대시보드에서 편집하는 동시에 AI가 MCP로 데이터를 쓸 수 있다.
즉 두 프로세스의 동시 접근을 일관되게 다뤄야 하고, MCP 서버가 실행 중인 대시보드 인스턴스를
찾아 연동(딥링크 등)할 수 있어야 한다.

### 결정
두 프로세스가 **하나의 SQLite 파일**(`careermate.sqlite`)을 공유한다. 동시성은 SQLite의
**WAL(Write-Ahead Logging)** 모드로 처리한다. 연결은 `packages/db/src/connection.ts`의
단일 `getDb()`에서 생성되며, 두 서버가 동일하게 이 모듈을 import 한다. 연결 시
`PRAGMA journal_mode = WAL`로 동시 읽기/쓰기를 허용하고, `PRAGMA busy_timeout = 5000`으로
쓰기 락 경합 시 최대 5초 대기하며, `PRAGMA foreign_keys = ON`으로 무결성을 강제한다.
`connection.ts` 주석이 이 의도를 명시한다.

> "Both the web server and the MCP server import this. SQLite with WAL handles the
> two-process concurrency (dashboard editing + AI writing) cleanly."

런타임 연동을 위해 데이터 디렉터리에 `server.json`을 두어 핸드셰이크한다. 대시보드가
실제로 바인딩한 포트 등 런타임 정보를 기록하고, MCP 서버는 이를 읽어 실행 중인 대시보드를
찾아 `open_dashboard`/`open_application` 같은 동작을 연결한다(포트가 사용 중이면 다음
포트로 폴백하므로 고정 포트를 가정할 수 없어 핸드셰이크가 필요하다).

### 결과
- 대시보드 편집과 AI 쓰기가 같은 데이터에 일관되게 반영된다(양방향 동일 DB).
- WAL + `busy_timeout`으로 두 프로세스 동시 접근이 락 오류 없이 처리된다.
- `server.json` 덕에 동적 포트 환경에서도 MCP→대시보드 딥링크가 동작한다.
- 트레이드오프: WAL 부가 파일(`-wal`, `-shm`)이 생기고, 두 프로세스가 같은 파일시스템
  위에 있어야 한다(로컬 전용 도구라 제약이 아님).

---

## 7. 자소서 버전관리 모델

- **날짜**: 2026-06-14

### 맥락
자기소개서는 한 번에 완성되지 않는다. 사용자(또는 그의 AI)는 같은 지원 건에 대해
여러 차례 고쳐 쓴다. 단일 본문 필드를 덮어쓰면 이전 초안과 수정 이력이 사라져, 어떤
버전을 어디에 제출했는지 추적할 수 없다.

### 결정
자소서를 단일 레코드가 아니라 **본문 + 버전 이력**으로 모델링한다. `cover_letters`와
`cover_letter_versions`를 분리해, 자소서의 각 수정본을 버전으로 누적 저장한다. MCP 도구
`save_cover_letter_version`으로 새 버전을 추가하고, 대시보드 Documents 페이지는 이를
**버전 타임라인**으로 보여준다. 내보내기는 `export_cover_letter`로 수행한다.

### 결과
- 자소서의 모든 수정 이력이 보존돼 이전 버전으로 되돌아보거나 비교할 수 있다.
- 어떤 버전을 어떤 지원에 사용했는지 추적이 가능하다.
- 대시보드에서 타임라인으로 진행 과정을 시각화한다.
- 트레이드오프: 단순 덮어쓰기보다 데이터 모델과 도구가 약간 더 복잡하다. 추적성 이점이
  이를 상회한다고 판단했다.

---

## 8. 순수 Node 러너(`run.mjs`) + stdout verdict 우회

- **날짜**: 2026-06-14

### 맥락
테스트 스크립트(`scripts/test.ts`, `scripts/ui-smoke.ts`)는 `tsx`로 실행되며 top-level
`await`를 사용한다. 그런데 **Windows에서 tsx 모듈이 top-level `await`를 쓴 뒤
`process.exit()`를 호출하면 종료 코드가 오염**된다. esbuild 로더가 트랜스파일 중간
상태일 때 프로세스가 종료되면서 실제 결과와 무관한 잘못된 exit code가 나온다. 이 때문에
`npm test`의 성공/실패를 종료 코드로 신뢰할 수 없다.

### 결정
종료 코드를 신뢰하지 않고, **테스트 스크립트가 stdout에 찍는 verdict 센티넬**로
성패를 판정하는 별도 러너 `scripts/run.mjs`를 둔다. 이 러너는 `tsx`가 아니라 **순수
Node(.mjs)**로 실행되므로 자신의 종료 코드는 오염되지 않는다. 러너는 자식 프로세스로
대상 tsx 스크립트를 띄우고, 자식의 mangled exit code는 무시한 채 stdout에 약속된
센티넬 문자열이 있는지로 판정한다.

```js
const res = spawnSync(process.execPath, ['--no-warnings', '--import', 'tsx', scriptPath], {
  encoding: 'utf8', env: process.env, timeout: 180000,
});
// ...자식 출력을 정리해 surface...
const passed = (res.stdout || '').includes(sentinel);
process.exit(passed ? 0 : 1);
```

`package.json`은 이 러너를 통해 테스트를 부른다.

```json
"test":    "node --no-warnings scripts/run.mjs scripts/test.ts \"TEST_VERDICT PASS\"",
"test:ui": "node --no-warnings scripts/run.mjs scripts/ui-smoke.ts \"UI_VERDICT PASS\""
```

추가로 러너는 Windows libuv 종료 단계에서 나오는 잡음 라인(`Assertion failed`,
`UV_HANDLE`, `Node.js vNN` 등)을 필터링해 출력을 깔끔하게 표면화한다.

### 결과
- Windows에서도 테스트 성패가 안정적으로 판정된다(종료 코드 오염 우회).
- 자식 출력은 그대로 보이되 libuv 잡음만 제거돼 가독성이 좋다.
- `test`는 `"TEST_VERDICT PASS"`, `test:ui`는 `"UI_VERDICT PASS"` 센티넬을 약속한다.
  테스트 스크립트는 반드시 성공 시 해당 문자열을 stdout에 출력해야 한다.
- 트레이드오프: 테스트가 "센티넬을 반드시 출력한다"는 규약에 의존한다. 센티넬 출력 전
  크래시하면 실패로 판정되는데(올바른 동작), 규약을 어긴 신규 테스트는 오탐할 수 있다.
