// 설정 페이지.
export default {
  // 공통
  'settings.copy': '복사',
  'settings.confirm': '확인',
  'settings.cancel': '취소',
  'settings.copyPath': '경로 복사',

  // 데이터 저장 위치
  'settings.dataLocation.title': '데이터 저장 위치',
  'settings.dataLocation.dataDir': '데이터 폴더',
  'settings.dataLocation.database': '데이터베이스',
  'settings.dataLocation.appVersion': '앱 버전',
  'settings.dataLocation.nodeVersion': 'Node 버전',
  'settings.dataLocation.privacyTitle': '내 컴퓨터에만 저장됩니다',
  'settings.dataLocation.privacyBody': '모든 데이터는 이 컴퓨터에만 저장됩니다. 외부로 전송되지 않습니다. AI에는 사용자가 직접 입력하거나 AI가 MCP로 조회한 정보만 전달됩니다.',

  // 연결 상태
  'settings.connection.title': '연결 상태',
  'settings.connection.shortcutDemoToast': '데모 바로가기 동작을 미리 보여드려요.',
  'settings.connection.shortcutToast': '대시보드 바로가기를 만들었어요.',
  'settings.connection.shortcutDemoTitle': '바로가기 미리보기',
  'settings.connection.shortcutTitle': '바로가기 생성',
  'settings.connection.shortcutDemoCalloutTitle': '데모에서는 파일을 만들지 않습니다',
  'settings.connection.shortcutCalloutTitle': '폴더를 만들었습니다',
  'settings.connection.shortcutDemoCalloutBody': '실제 앱에서는 대시보드 바로가기 폴더와 실행 파일을 만들고, 여기서는 경로 예시만 보여줍니다.',
  'settings.connection.shortcutCalloutBody': '대시보드가 실행 중이면 브라우저만 열고, 꺼져 있으면 서버를 시작한 뒤 브라우저를 엽니다.',
  'settings.connection.shortcutFolder': '폴더',
  'settings.connection.shortcutLauncher': '바로가기',
  'settings.connection.running': '실행 중',
  'settings.connection.dashboard': '대시보드',
  'settings.connection.createShortcut': '바로가기 만들기',
  'settings.connection.mcpServer': 'MCP 서버',
  'settings.connection.mcpBody': 'MCP 서버는 사용하시는 AI 클라이언트(Claude·ChatGPT·Cursor)가 직접 실행하며, 이 대시보드와 같은 데이터베이스를 공유합니다.',
  'settings.connection.openInstall': '설치·연결 안내 열기',

  // 테마
  'settings.theme.title': '테마',
  'settings.theme.sub': '시스템 설정을 따르거나 직접 고를 수 있어요',
  'settings.theme.light': '라이트',
  'settings.theme.dark': '다크',
  'settings.theme.system': '시스템',

  // 자소서 수치 점검 모드
  'settings.verify.title': '자소서 수치 점검',
  'settings.verify.sub': 'AI가 쓴 수치가 내 실제 데이터에 근거가 있는지 저장 전에 자동으로 확인합니다',
  'settings.verify.basic': '기본',
  'settings.verify.strict': '엄격',
  'settings.verify.basicDesc': '저장된 경력·이력서·프로젝트에 아예 근거가 없는 수치만 차단',
  'settings.verify.strictDesc': '이력서 본문에 없고 구조화 경력/프로젝트 항목에만 있는 수치까지 차단',
  'settings.verify.strictOnToast': '엄격 모드를 켰어요.',
  'settings.verify.strictOffToast': '엄격 모드를 껐어요.',
  'settings.verify.note': '엄격 모드에선 올린 이력서에 없는 수치가 막힐 수 있어요. 막히면 이력서를 올리거나 모드를 끄세요. AI에게 "엄격하게 봐줘"라고 해도 켤 수 있습니다.',

  // 내 데이터
  'settings.myData.title': '내 데이터',
  'settings.myData.sub': '이 컴퓨터에 저장된 항목 수',

  // 항목 라벨 (COUNT_LABELS / BACKUP_COUNT_LABELS)
  'settings.count.profile': '프로필',
  'settings.count.experiences': '경력',
  'settings.count.projects': '프로젝트',
  'settings.count.skills': '기술',
  'settings.count.documents': '문서',
  'settings.count.cover_letters': '자기소개서',
  'settings.count.jobs': '채용공고',
  'settings.count.applications': '지원',
  'settings.count.interview_preps': '면접 준비',
  'settings.count.cover_letter_versions': '자소서 버전',
  'settings.count.fit_analyses': '적합도 분석',
  'settings.count.activities': '활동',

  // 내보내기 / 가져오기
  'settings.backup.title': '내보내기 / 가져오기',
  'settings.backup.export': '내보내기(JSON)',
  'settings.backup.import': '가져오기(JSON)',
  'settings.backup.create': '현재 상태 백업',
  'settings.backup.createToast': '백업을 생성했어요.',
  'settings.backup.colFile': '파일',
  'settings.backup.colCreated': '생성',
  'settings.backup.colSize': '크기',
  'settings.backup.size': '{{kb}} KB',
  'settings.backup.empty': '아직 로컬 백업이 없습니다. "현재 상태 백업"으로 지금 데이터를 보관하세요.',
  'settings.backup.readError': '백업 파일을 읽지 못했어요.',
  'settings.backup.parseError': 'JSON 백업 파일만 복원할 수 있어요.',
  'settings.backup.unknownDate': '알 수 없음',

  // 가져오기 미리보기 표
  'settings.preview.empty': '복원할 항목이 없습니다.',
  'settings.preview.colData': '데이터',
  'settings.preview.colCount': '항목',

  // 가져오기 모달
  'settings.import.gateWord': '가져오기',
  'settings.import.title': '데이터 가져오기',
  'settings.import.calloutTitle': '현재 데이터는 먼저 백업됩니다',
  'settings.import.calloutBody': '가져오면 이 컴퓨터의 CareerMate 데이터가 선택한 JSON 내용으로 전체 교체됩니다.',
  'settings.import.file': '파일',
  'settings.import.exportedAt': '백업 시각',
  'settings.import.schema': '스키마',
  'settings.import.schemaValue': '{{version}} / 현재 {{current}}',
  'settings.import.totalRows': '전체 항목',
  'settings.import.warningsTitle': '확인 필요',
  'settings.import.instruction': '계속하려면 아래 입력란에 {{word}} 를 입력하세요.',
  'settings.import.confirm': '가져오기',
  'settings.import.doneToast': '데이터를 가져왔어요.',

  // 위험 구역
  'settings.reset.gateWord': '초기화',
  'settings.reset.title': '모든 데이터 초기화',
  'settings.reset.calloutTitle': '되돌릴 수 없습니다',
  'settings.reset.calloutBody': '프로필·공고·지원·문서·면접 준비를 포함한 모든 데이터가 영구적으로 삭제됩니다. 안전을 위해 초기화 직전에 자동으로 백업이 한 번 생성됩니다.',
  'settings.reset.instruction': '계속하려면 아래 입력란에 {{word}} 를 입력하세요.',
  'settings.reset.confirm': '모든 데이터 초기화',
  'settings.reset.doneToast': '모든 데이터를 초기화했어요.',
  'settings.danger.title': '위험 구역',
  'settings.danger.sub': '이 작업은 되돌릴 수 없습니다',
  'settings.danger.resetTitle': '모든 데이터 초기화',
  'settings.danger.resetBody': '이 컴퓨터에 저장된 모든 CareerMate 데이터를 삭제합니다. 초기화 전에 자동으로 백업이 생성됩니다.',
};
