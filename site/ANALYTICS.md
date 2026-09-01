# CareerMate 공개 사이트 분석 이벤트

`site/analytics.js`는 `careermate.life`와 `www.careermate.life`에서만 실행합니다. 로컬 대시보드(`127.0.0.1`)의 커리어 데이터는 수집하지 않습니다.

## 설치 퍼널

| 단계 | GA4 이벤트 | 주요 파라미터 |
|---|---|---|
| 랜딩 방문 | `page_view` | `page_path` |
| 데모 진입 | `view_demo` | `cta_location` |
| 설치 시작 | `begin_install` | `cta_location` |
| AI 선택 | `select_ai_client` | `ai_client` |
| 운영체제 선택 | `select_os` | `operating_system` |
| 맞춤 설치 경로 노출 | `view_install_path` | `ai_client`, `operating_system` |
| 설치 방법 펼침 | `open_install_method` | `ai_client`, `method` |
| 설치 문장 복사 | `copy_install_command` | `target` |

실제 설치는 사용자의 PC에서 로컬로 끝나므로 자동 완료 텔레메트리를 보내지 않습니다. 웹 퍼널의 마지막 개인정보 비수집 전환 신호는 `copy_install_command`입니다.

## GA4 주요 이벤트

GA4 관리 화면에서 다음 이벤트를 주요 이벤트로 지정합니다.

1. `begin_install`
2. `view_install_path`
3. `copy_install_command`

`view_demo`는 보조 전환으로 별도 보고합니다. 이벤트 이름은 배포 코드에서 생성할 수 있지만 주요 이벤트 지정은 GA4 속성 관리 설정이므로 코드만으로 변경하지 않습니다.

## 검증

배포 후 URL에 `?ga_debug=1`을 붙여 GA4 DebugView에서 확인합니다. 테스트할 때는 랜딩 → 처음 시작하기 → AI 선택 → 운영체제 선택 → 추천 방법 펼치기 → 설치 문장 복사 순서로 진행합니다.
