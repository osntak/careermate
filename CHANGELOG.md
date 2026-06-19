# 변경 이력 (Changelog)

이 프로젝트의 주요 변경 사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를
따르고, 버전은 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따릅니다.

## [0.0.5] - 2026-06-19

### 추가 (Added)
- 공고와 자기소개서를 삭제할 수 있는 MCP 도구(`delete_job_posting`, `delete_cover_letter`) 추가.
- 공고 적합도 분석 저장 후, 자기소개서를 바로 작성할지 사용자에게 선택지를 제안하도록 안내 강화.
- "CareerMate 업데이트해줘" 같은 직접 요청이 업데이트 도구로 이어지도록 LLM 지침과 도구 설명 보강.

### 변경 (Changed)
- MCP 결과 메시지를 사용자 친화적으로 다듬고 내부 식별자·도구명을 사용자 대면 문장에서 덜 노출.
- 업데이트 확인/온보딩 상태 응답의 안내 문구를 자연스러운 사용자 메시지 중심으로 정리.

### 수정 (Fixed)
- 모바일 390px 설정 화면에서 카드 헤더 액션 버튼이 가로 오버플로를 만들던 문제 수정.

## [0.0.4] - 2026-06-18

### 추가 (Added)
- 구조화 항목(스킬·경력·프로젝트) MCP 도구의 배치 입력과 멱등 upsert: 같은 키를 다시 저장해도 중복 없이 갱신.
- 공고 상세 화면 재배치: 자소서·면접 자료를 상단 2열로, 공고 원문은 아코디언으로.
- 설치 안내(start.html)에 Claude CLI 설치(방법 3) 추가 및 방법 2/3 아코디언 정리.

### 수정 (Fixed)
- 대시보드가 '공고를 찾을 수 없음'·금지된 상태 전환 같은 도메인 오류를 불투명한 500(`서버 오류가 발생했습니다`)으로 삼키던 문제 — 이제 정확한 상태 코드(404/409/400)와 한국어 메시지로 표시한다(채팅/MCP와 동일하게). 오래된 탭에서 이미 삭제된 공고의 상태를 바꿔도 자동 새로고침으로 복구된다.
- 면접 진행 등 활성 상태에서 '작성 중'으로 되돌리려 할 때, 막힌 이유와 '지원 예정' 대안을 명확히 안내.
- LLM이 keywords·requirements 등을 문자열로 직렬화해 보내도 배열로 흡수(`strList` 코어션).

## [0.0.3] - 2026-06-18

### 수정 (Fixed)
- Claude `.mcpb` 설치 직후 즉시 종료되던 문제: manifest의 `--experimental-sqlite` 플래그 제거(Claude 내장 Node 24가 해당 플래그를 거부). 호환 런타임을 `>=22.13`으로 명시.
- `init`이 `.mcp.json`을 설치 폴더가 아닌 현재 작업 폴더에 기록하도록 수정(+회귀 테스트).

### 변경 (Changed)
- 도구 목록을 레지스트리 기준 35개로 재생성하고 버전 메타데이터를 코드와 동기화.

## [0.0.2] - 2026-06-18

### 변경 (Changed)
- Claude Desktop의 `.mcpb` 직접 추가 실패를 알려진 이슈로 문서화하고, `careermate.zip` 압축 해제 후 폴더 추가를 권장 우회 경로로 안내.
- `npm run build:mcpb`가 `dist/careermate.mcpb`와 동일한 번들의 `dist/careermate.zip`을 함께 생성하도록 변경.
- GitHub Release 워크플로우가 `careermate.mcpb`와 `careermate.zip` 두 자산을 모두 검증·업로드하도록 보강.

## [0.0.1] - 2026-06-18

### 추가 (Added)
- 최초 공개 릴리스: MCP-우선 로컬 커리어 워크스페이스.
- 33개 MCP 도구, 7페이지 로컬 대시보드(`127.0.0.1:4319`).
- 5종 표준 워크플로우(온보딩·공고 분석·자소서 작성·지원 상태 관리·면접 준비).
- Career-OS 전문가 지식 배선(`get_workflow_guide` → `get_playbook`/`get_verifier`): 16개 도메인 플레이북 + 6개 검증 루브릭을 연결된 AI에게 serve.
- 문서 읽기(`read_document`): PDF/Word(`.docx`)/한컴(`.hwp`/`.hwpx`)/텍스트 순수 JS 추출.
- 로컬 stdio MCP 서버와 대시보드가 같은 SQLite DB를 공유.

### 보안 (Security)
- MCP/HTTP 입력 자유 텍스트 필드 길이 상한(본문 200KB·노트 10KB·한 줄 500자·배열 원소 2KB/길이 500).
- `127.0.0.1` 전용 바인딩, DNS 리바인딩 차단, CSRF 토큰, 정적 파일 경로 traversal 차단.
- 내보내기 HTML 인젝션 무력화(raw `<img>`/`<script>`, `javascript:` 링크, 링크 속성·제목 인젝션).
- 민감 정보(이력서·자소서 본문) 로그·에러 응답 비노출.

[0.0.5]: https://github.com/osntak/careermate/releases/tag/v0.0.5
[0.0.4]: https://github.com/osntak/careermate/releases/tag/v0.0.4
[0.0.3]: https://github.com/osntak/careermate/releases/tag/v0.0.3
[0.0.2]: https://github.com/osntak/careermate/releases/tag/v0.0.2
[0.0.1]: https://github.com/osntak/careermate/releases/tag/v0.0.1
