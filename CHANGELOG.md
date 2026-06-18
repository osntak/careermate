# 변경 이력 (Changelog)

이 프로젝트의 주요 변경 사항을 기록합니다. 형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를
따르고, 버전은 [유의적 버전(SemVer)](https://semver.org/lang/ko/)을 따릅니다.

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

[0.0.2]: https://github.com/osntak/careermate/releases/tag/v0.0.2
[0.0.1]: https://github.com/osntak/careermate/releases/tag/v0.0.1
