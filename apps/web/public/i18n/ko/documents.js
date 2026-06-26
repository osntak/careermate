// 문서 페이지 — 자기소개서/경력기술서/이력서·포트폴리오.
export default {
  // tabs
  'documents.tab.cover': '자기소개서',
  'documents.tab.career': '경력기술서',
  'documents.tab.docs': '이력서·포트폴리오',

  // search / loading / empty
  'documents.search.cover': '자기소개서 검색',
  'documents.search.career': '경력기술서 검색',
  'documents.search.docs': '이력서·포트폴리오 검색',
  'documents.search.aria': '검색',
  'documents.search.empty': '‘{{query}}’에 맞는 항목이 없어요.',
  'documents.search.clear': '필터 초기화',
  'documents.loading': '불러오는 중…',

  // create actions
  'documents.action.coverCreate': '자기소개서 추가',
  'documents.action.careerCreate': '경력기술서 추가',
  'documents.action.docCreate': '문서 추가',

  // cover letters tab — empty state
  'documents.cover.empty.title': '아직 자기소개서가 없어요',
  'documents.cover.empty.body': '작성하거나 붙여넣어 버전과 함께 보관하세요.',

  // cover row
  'documents.cover.versionCount': '버전 {{count}}개',
  'documents.cover.primary': '대표',
  'documents.cover.open': '열기',
  'documents.cover.copy': '복사',
  'documents.cover.exportMd': 'MD',
  'documents.cover.exportHtml': 'HTML',
  'documents.cover.exportDocx': 'Word',
  'documents.cover.exportMdTitle': 'Markdown 내보내기',
  'documents.cover.exportHtmlTitle': 'HTML 내보내기',
  'documents.cover.exportDocxTitle': 'Word(.docx) 내보내기',
  'documents.cover.setPrimary': '대표 지정',
  'documents.cover.delete': '삭제',
  'documents.cover.noContent': '아직 내용이 없습니다.',

  // cover toasts / confirm
  'documents.cover.setPrimaryToast': '대표 자기소개서로 지정했어요.',
  'documents.cover.deleteTitle': '자기소개서 삭제',
  'documents.cover.deleteConfirm': '"{{title}}"을(를) 삭제할까요? 모든 버전 기록이 함께 삭제됩니다.',
  'documents.cover.deleteConfirmLabel': '삭제',
  'documents.cover.deleteToast': '자기소개서를 삭제했어요.',

  // cover create modal
  'documents.coverCreate.title': '새 자기소개서',
  'documents.coverCreate.titlePlaceholder': '예: 백엔드 개발자 자기소개서',
  'documents.coverCreate.contentPlaceholder': '내용을 붙여넣으세요. 비워 두면 빈 자기소개서가 만들어집니다.',
  'documents.coverCreate.jobNone': '연결 안 함',
  'documents.coverCreate.fieldTitle': '제목 (필수)',
  'documents.coverCreate.fieldContent': '내용 (선택)',
  'documents.coverCreate.fieldContentHint': '내용을 입력하면 첫 버전으로 저장됩니다.',
  'documents.coverCreate.fieldJob': '연결할 공고 (선택)',
  'documents.coverCreate.fieldJobHint': '특정 공고에 연결하면 그 공고 화면에서 함께 보여요.',
  'documents.coverCreate.fieldJobHintEmpty': '저장된 공고가 아직 없어요.',
  'documents.coverCreate.cancel': '취소',
  'documents.coverCreate.submit': '자기소개서 저장',
  'documents.coverCreate.titleRequired': '제목을 입력해 주세요.',
  'documents.coverCreate.toast': '자기소개서를 추가했어요.',

  // cover detail body
  'documents.coverDetail.exportMd': 'MD 내보내기',
  'documents.coverDetail.exportHtml': 'HTML 내보내기',
  'documents.coverDetail.exportDocx': 'Word 내보내기',
  'documents.coverDetail.currentVersion': '현재 버전',
  'documents.coverDetail.copy': '복사',
  'documents.coverDetail.noContent': '내용이 없습니다.',
  'documents.coverDetail.history': '버전 기록',
  'documents.coverDetail.historyEmpty': '아직 버전 기록이 없습니다.',

  // version item
  'documents.version.label': 'v{{n}}',
  'documents.version.current': '현재 버전',
  'documents.version.view': '이 버전 보기',
  'documents.version.viewLabel': 'v{{n}} 보기',
  'documents.version.makeCurrent': '현재 버전으로 지정',
  'documents.version.copy': '복사',
  'documents.version.makeCurrentToast': '현재 버전을 변경했어요.',

  // edit new version
  'documents.editVersion.notePlaceholder': '예: 지원동기 보강, 문장 다듬기',
  'documents.editVersion.fieldContent': '내용',
  'documents.editVersion.fieldNote': '변경 메모 (선택)',
  'documents.editVersion.submit': '새 버전으로 저장',
  'documents.editVersion.contentRequired': '내용을 입력해 주세요.',
  'documents.editVersion.toast': '새 버전을 저장했어요.',
  'documents.editVersion.cancel': '취소',
  'documents.editVersion.toggle': '수정하여 새 버전 저장',

  // career descriptions tab — empty state
  'documents.career.empty.title': '아직 경력기술서가 없어요',
  'documents.career.empty.body': 'AI에게 경력기술서 작성을 요청하면 여기에 저장돼요.',
  'documents.career.empty.action': '직접 추가',

  // documents tab — empty state
  'documents.docs.empty.title': '저장된 문서가 없어요',
  'documents.docs.empty.body': '이력서·포트폴리오·기타 문서를 보관하세요.',
  'documents.docs.empty.action': '문서 추가',

  // doc detail modal
  'documents.docDetail.updated': '수정 {{when}}',
  'documents.docDetail.noContent': '내용이 없습니다.',
  'documents.docDetail.copy': '복사',
  'documents.docDetail.export': 'MD',
  'documents.docDetail.exportTitle': 'Markdown 내보내기',
  'documents.docDetail.exportHtml': 'HTML',
  'documents.docDetail.exportHtmlTitle': 'HTML 내보내기',
  'documents.docDetail.exportDocx': 'Word',
  'documents.docDetail.exportDocxTitle': 'Word(.docx) 내보내기',
  'documents.docDetail.delete': '삭제',
  'documents.docDetail.deleteTitle': '문서 삭제',
  'documents.docDetail.deleteConfirm': '"{{title}}"을(를) 삭제할까요?',
  'documents.docDetail.deleteConfirmLabel': '삭제',
  'documents.docDetail.deleteToast': '문서를 삭제했어요.',
  'documents.docDetail.edit': '수정',

  // doc form
  'documents.docForm.defaultKind': '문서',
  'documents.docForm.editTitle': '문서 수정',
  'documents.docForm.createTitle': '{{kind}} 추가',
  'documents.docForm.titlePlaceholderCareer': '예: 마스터 경력기술서',
  'documents.docForm.titlePlaceholderDefault': '예: 2026 이력서',
  'documents.docForm.contentPlaceholderCareer': '경력기술서 본문을 붙여넣으세요.',
  'documents.docForm.contentPlaceholderDefault': '이력서·포트폴리오 본문을 붙여넣으세요.',
  'documents.docForm.fieldKind': '종류',
  'documents.docForm.fieldTitle': '제목 (필수)',
  'documents.docForm.fieldContent': '내용 (필수)',
  'documents.docForm.markPrimary': '대표 문서로 지정',
  'documents.docForm.cancel': '취소',
  'documents.docForm.submit': '문서 저장',
  'documents.docForm.titleRequired': '제목을 입력해 주세요.',
  'documents.docForm.contentRequired': '내용을 입력해 주세요.',
  'documents.docForm.editToast': '문서를 수정했어요.',
  'documents.docForm.createToast': '문서를 추가했어요.',
};
