# 보안 정책

**한국어** · [English](#security-policy)

CareerMate는 **로컬 우선(local-first)** 도구입니다. 모든 커리어 데이터는 사용자 컴퓨터의
`~/.careermate`(Windows: `%USERPROFILE%\.careermate`)에만 저장되며, 대시보드는 `127.0.0.1`
에만 바인딩됩니다. (선택적 버전 확인을 제외하고) 어떤 사용자 데이터도 네트워크로 전송되지
않습니다.

## 지원 버전

보안 업데이트는 **항상 최신 버전**에만 반영됩니다(현재 `0.0.x`). 늘 최신 버전을 쓰세요 —
업데이트 방법은 [`INSTALL.md`](INSTALL.md)와 `check_for_update` / `update_careermate` MCP
도구를 참고하세요.

## 취약점 신고

보안 취약점을 발견하면 **공개 이슈로 올리지 말고** 비공개로 신고해 주세요:

1. GitHub 저장소의 **Security → Report a vulnerability**
   ([GitHub Security Advisories](https://github.com/osntak/careermate/security/advisories/new))를
   사용해 비공개로 보고합니다.
2. 재현 절차, 영향 범위, 가능하면 PoC를 포함해 주세요.

가능한 한 빠르게 확인 응답을 드리고, 수정 후 공개 일정을 함께 조율합니다.

## 설계상의 보안 속성

CareerMate는 다음을 구조적으로 보장합니다(테스트로 회귀를 고정 — `scripts/test.ts`):

- **로컬 전용 바인딩**: 웹 대시보드는 `127.0.0.1`에서만 수신합니다.
- **CSRF 보호**: 상태를 바꾸는 요청은 세션 토큰을 요구합니다(토큰 없으면 403).
- **Origin 검증**: 외부 Origin에서의 요청을 차단합니다.
- **Host 검증(DNS 리바인딩 방지)**: 허용되지 않은 Host 헤더를 차단합니다.
- **입력 검증**: 모든 MCP/HTTP 입력은 zod 스키마로 검증되며, 자유 텍스트 필드에는 길이
  상한이 있어 과도한 입력으로 인한 자원 고갈을 막습니다.
- **출력 인코딩**: 대시보드는 사용자 데이터를 `textContent`로 렌더링하고, 링크는
  `javascript:`/`data:` 등 위험한 스킴을 차단합니다. HTML 내보내기는 입력을 먼저
  이스케이프한 뒤 자체 안전 태그만 재도입합니다(저장된 문서를 통한 XSS 방지).
- **문서 읽기 한도**: `read_document`는 파일 크기·페이지 수·압축 해제 크기에 상한을 두어
  악성/거대 파일로 인한 메모리 고갈을 방지합니다.
- **외부 업로드 없음**: 사용자 데이터는 절대 외부로 전송되지 않습니다.

## 사용자가 알아야 할 점

- `~/.careermate`의 데이터는 **평문**으로 저장됩니다(로컬 파일 권한에 의존). 디스크 암호화가
  필요하면 OS 수준 디스크 암호화(BitLocker/FileVault 등)를 사용하세요.
- 대시보드 주소(`127.0.0.1:4319`)는 같은 컴퓨터의 다른 로컬 프로세스에서 접근할 수 있으므로,
  신뢰할 수 없는 사용자와 계정을 공유하는 컴퓨터에서는 주의하세요.

---

# Security Policy

[한국어](#보안-정책) · **English**

CareerMate is a **local-first** tool. All career data is stored only under
`~/.careermate` on your own machine (`%USERPROFILE%\.careermate` on Windows), and the
dashboard binds only to `127.0.0.1`. Apart from an optional version check, no user data
is ever sent over the network.

## Supported versions

Security updates land only on the **latest version** (currently `0.0.x`). Always run the
latest version — see [`INSTALL.md`](INSTALL.md) and the `check_for_update` /
`update_careermate` MCP tools for how to update.

## Reporting a vulnerability

If you find a security vulnerability, **do not open a public issue** — report it
privately:

1. Use **Security → Report a vulnerability** on the GitHub repository
   ([GitHub Security Advisories](https://github.com/osntak/careermate/security/advisories/new)).
2. Please include reproduction steps, the scope of impact, and a PoC if you have one.

We'll acknowledge your report as quickly as we can and coordinate a disclosure timeline
once a fix is ready.

## Security properties by design

CareerMate guarantees the following structurally, with regression tests pinning them
(`scripts/test.ts`):

- **Local-only binding**: the web dashboard listens only on `127.0.0.1`.
- **CSRF protection**: state-changing requests require a session token (403 without one).
- **Origin checking**: requests from external origins are rejected.
- **Host checking (anti DNS-rebinding)**: disallowed Host headers are rejected.
- **Input validation**: every MCP/HTTP input is validated with zod schemas, and free-text
  fields have length caps so oversized input can't exhaust resources.
- **Output encoding**: the dashboard renders user data via `textContent`, and links block
  dangerous schemes such as `javascript:` / `data:`. HTML export escapes input first and
  only re-introduces its own safe tags (preventing XSS through stored documents).
- **Document-reading limits**: `read_document` caps file size, page count, and
  decompressed size to prevent memory exhaustion from malicious or huge files.
- **No external upload**: user data is never sent off the machine.

## What you should know

- Data under `~/.careermate` is stored in **plaintext** (it relies on local file
  permissions). If you need encryption, use OS-level disk encryption such as BitLocker or
  FileVault.
- The dashboard address (`127.0.0.1:4319`) is reachable by other local processes on the
  same machine, so be careful on computers shared with people you don't trust.
