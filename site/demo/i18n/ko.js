// 한국어 카탈로그 — 영역별 모듈을 합쳐 단일 플랫 맵으로 export.
// 새 로케일/영역 추가 = 파일 1개 + import 1줄. 가드(check-i18n-keys)는 이 합본 키집합을 검사한다.
// ko엔 복수 객체 금지(CLDR 'other'만) — 카운트는 카운터 접미사 문자열로.
import common from './ko/common.js';
import nav from './ko/nav.js';
import status from './ko/status.js';
import settings from './ko/settings.js';
import home from './ko/home.js';
import jobs from './ko/jobs.js';
import documents from './ko/documents.js';
import profile from './ko/profile.js';
import interview from './ko/interview.js';
import applications from './ko/applications.js';

export default {
  ...common, ...nav, ...status, ...settings,
  ...home, ...jobs, ...documents, ...profile, ...interview, ...applications,
};
