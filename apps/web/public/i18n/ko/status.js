// enum 라벨(클라이언트 현지화). 키는 CODE와 동일 — 서버는 코드를 내려주고 라벨은 클라가 t()로.
// 이 키들은 packages/shared/src/enums.ts의 CODE와 1:1로 맞춘다.
export default {
  // application status
  'status.draft': '작성 중',
  'status.planned': '지원 예정',
  'status.applied': '지원 완료',
  'status.document_passed': '서류 합격',
  'status.interview': '면접 진행',
  'status.final_passed': '최종 합격',
  'status.rejected': '불합격',
  'status.on_hold': '보류',
  // document kind
  'kind.resume': '이력서',
  'kind.career_description': '경력기술서',
  'kind.portfolio': '포트폴리오',
  'kind.other': '기타 문서',
  // content source
  'source.manual': '직접 입력',
  'source.upload': '파일 업로드',
  'source.ai': 'AI 생성',
  'source.edit': '직접 수정',
};
