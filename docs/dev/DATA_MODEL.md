# 데이터 모델 (Data Model)

CareerMate는 모든 데이터를 사용자 컴퓨터의 단일 SQLite 파일(`careermate.sqlite`)에 저장한다. 클라우드 전송도, 외부 서버도 없다. 대시보드(`apps/web`)와 MCP 서버(`apps/mcp`)는 **같은 DB 파일을 공유**하며, 각자 부팅 시 마이그레이션을 호출해도 안전하다(멱등).

이 문서는 실제 스키마(`packages/db/src/schema.ts`)와 zod 스키마(`packages/shared/src/schemas.ts`), enum 정의(`packages/shared/src/enums.ts`)에 정확히 일치한다.

관련 문서:
- 데이터 저장 경로/환경변수: 이 문서의 [데이터 저장 위치](#데이터-저장-위치) 절, `packages/db/src/paths.ts`
- MCP 도구로의 입출력 형태: zod의 `*Input` / `*Record` 레이어 (`packages/shared/src/schemas.ts`)

---

## 목차

1. [설계 원칙](#설계-원칙)
2. [테이블 목록](#테이블-목록)
3. [테이블 상세](#테이블-상세)
4. [엔티티 관계 (ER)](#엔티티-관계-er)
5. [JSON 텍스트 컬럼](#json-텍스트-컬럼)
6. [마이그레이션](#마이그레이션)
7. [인덱스](#인덱스)
8. [데이터 저장 위치](#데이터-저장-위치)
9. [백업 / 내보내기](#백업--내보내기)

---

## 설계 원칙

- **타입 표기**: SQLite의 동적 타입을 사용한다. 컬럼 선언 타입은 `TEXT`, `INTEGER`, `REAL` 세 가지만 등장한다.
  - `TEXT` — 문자열. ID, 본문, 날짜(ISO 문자열) 모두 `TEXT`.
  - `INTEGER` — 정수. boolean은 `INTEGER`로 저장(`0`/`1`)되며, 레포지토리에서 boolean으로 변환한다. 정렬용 `order_index`, 버전 번호도 `INTEGER`.
  - `REAL` — 부동소수. `skills.years`, `fit_analyses.score`.
- **날짜/시간**: 모든 `created_at` / `updated_at`은 ISO 8601 문자열(`TEXT`)이다. `start_date`, `end_date`, `deadline` 등은 `YYYY-MM` 또는 `YYYY-MM-DD` 자유 문자열이다.
- **JSON 텍스트 컬럼**: 배열/객체 형태의 중첩 데이터는 JSON 문자열로 `TEXT` 컬럼에 저장하고, 레포지토리가 파싱해 배열/객체로 돌려준다. 본문에서 **(JSON)** 으로 표기한다.
- **NULL 가능성**: zod `*Record` 스키마의 `.nullable()` 여부가 NULL 허용을 나타낸다. 본문 표의 "NULL" 열에 반영했다.
- **입력 vs 저장**: MCP 도구/HTTP API가 받는 형태는 `*Input`(부분/선택 필드 다수), DB에 저장되어 반환되는 형태는 `*Record`(id + 타임스탬프 포함)다.

> 참고: SQLite 컬럼 선언상의 `NOT NULL DEFAULT '[]'` 같은 기본값은 빈 JSON 배열을 의미한다. 즉 "값이 없으면 빈 배열"로 저장되며, 레코드에서는 항상 배열로 나타난다.

---

## 테이블 목록

데이터 테이블 12개와 스키마 버전 메타 테이블 1개(`_meta`)로 구성된다.

| # | 테이블 | 의미 |
|---|--------|------|
| 1 | `profile` | 사용자 기본 프로필(이름/연락처/희망 직무/작성 선호 등). 단일 레코드 운용. |
| 2 | `experiences` | 경력(회사별 재직 이력). |
| 3 | `projects` | 프로젝트 이력. |
| 4 | `skills` | 보유 기술/역량. |
| 5 | `documents` | 이력서·경력기술서·포트폴리오 등 본문 문서. |
| 6 | `cover_letters` | 자기소개서(헤더/메타. 본문은 버전 테이블에). |
| 7 | `cover_letter_versions` | 자기소개서 버전별 본문(이력 추적). |
| 8 | `jobs` | 채용 공고. |
| 9 | `fit_analyses` | 공고에 대한 적합도 분석 결과. |
| 10 | `applications` | 지원 현황(공고당 1건, 상태 8단계). |
| 11 | `interview_preps` | 면접 준비 자료(공고당 1건). |
| 12 | `activities` | 활동 피드(타임라인). |
| — | `_meta` | 스키마 버전 등 메타 키-값. |

---

## 테이블 상세

각 표의 컬럼/타입은 `packages/db/src/schema.ts`의 `CREATE TABLE`과 정확히 일치한다. "NULL" 열은 `*Record` zod 스키마의 nullable 여부 기준이다.

### 1. `profile`

단일 사용자 프로필. 보통 한 개의 레코드만 존재한다.

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `name` | TEXT | Y | 이름 |
| `email` | TEXT | Y | 이메일 |
| `phone` | TEXT | Y | 연락처 |
| `location` | TEXT | Y | 지역 |
| `headline` | TEXT | Y | 한 줄 소개 / 직무 타이틀 |
| `summary` | TEXT | Y | 자기소개 요약 |
| `desired_roles` | TEXT **(JSON)** | N | 희망 직무 문자열 배열. 기본 `[]` |
| `desired_conditions` | TEXT | Y | 희망 근무 조건(연봉/지역/근무형태 등) |
| `preferred_tone` | TEXT | Y | 자기소개서 선호 문체 |
| `emphasis_points` | TEXT **(JSON)** | N | 강조 포인트 문자열 배열. 기본 `[]` |
| `links` | TEXT **(JSON)** | N | `{label, url}` 객체 배열(포트폴리오/깃허브/링크드인). 기본 `[]` |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 2. `experiences`

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `company` | TEXT | N | 회사명(필수) |
| `role` | TEXT | Y | 직무/직책 |
| `employment_type` | TEXT | Y | 정규직/계약직/인턴/프리랜서 등 |
| `start_date` | TEXT | Y | 시작일(`YYYY-MM` 또는 `YYYY-MM-DD`) |
| `end_date` | TEXT | Y | 종료일(재직 중이면 비움) |
| `is_current` | INTEGER | N | 재직 중 여부(0/1 → boolean). 기본 `0` |
| `description` | TEXT | Y | 업무 설명 |
| `achievements` | TEXT **(JSON)** | N | 성과/업적 문자열 배열. 기본 `[]` |
| `tech` | TEXT **(JSON)** | N | 사용 기술/도구 문자열 배열. 기본 `[]` |
| `order_index` | INTEGER | N | 정렬 순서. 기본 `0` |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 3. `projects`

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `name` | TEXT | N | 프로젝트명(필수) |
| `role` | TEXT | Y | 담당 역할 |
| `description` | TEXT | Y | 설명 |
| `highlights` | TEXT **(JSON)** | N | 핵심 성과 문자열 배열. 기본 `[]` |
| `tech` | TEXT **(JSON)** | N | 사용 기술 문자열 배열. 기본 `[]` |
| `url` | TEXT | Y | 링크 |
| `start_date` | TEXT | Y | 시작일 |
| `end_date` | TEXT | Y | 종료일 |
| `order_index` | INTEGER | N | 정렬 순서. 기본 `0` |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 4. `skills`

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `name` | TEXT | N | 기술명(필수) |
| `category` | TEXT | Y | 언어/프레임워크/툴/소프트스킬 등 |
| `level` | TEXT | Y | 상/중/하 또는 자유 서술 |
| `years` | REAL | Y | 경력 연수 |
| `order_index` | INTEGER | N | 정렬 순서. 기본 `0` |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 5. `documents`

이력서/경력기술서/포트폴리오 등 본문을 가진 문서. (자기소개서는 별도 테이블.)

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `kind` | TEXT | N | 문서 종류: `resume` / `career_description` / `portfolio` / `other` |
| `title` | TEXT | N | 제목(필수) |
| `content` | TEXT | N | 본문(Markdown 또는 일반 텍스트). 기본 `''` |
| `source` | TEXT | N | 출처: `manual` / `upload` / `ai` / `edit`. 기본 `'manual'` |
| `is_primary` | INTEGER | N | 대표 문서 여부(0/1 → boolean). 기본 `0` |
| `tags` | TEXT **(JSON)** | N | 태그 문자열 배열. 기본 `[]` |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 6. `cover_letters`

자기소개서의 헤더/메타. **본문은 `cover_letter_versions`에 버전별로 저장**된다.

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `title` | TEXT | N | 제목(필수) |
| `job_id` | TEXT | Y | 연결된 공고(`jobs.id`). 없으면 범용 자기소개서 |
| `is_primary` | INTEGER | N | 대표 여부(0/1 → boolean). 기본 `0` |
| `current_version_id` | TEXT | Y | 현재 버전(`cover_letter_versions.id`) |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

> 참고: 레코드(`CoverLetterRecord`)로 조회할 때는 `version_count`, `current_content`, `versions[]` 같은 파생/조인 필드가 추가로 채워진다(저장 컬럼이 아니라 레포지토리 조립 결과).

### 7. `cover_letter_versions`

자기소개서 한 건의 버전별 본문 이력.

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `cover_letter_id` | TEXT | N | 소속 자기소개서(`cover_letters.id`). 필수 |
| `version_no` | INTEGER | N | 버전 번호(1부터 증가) |
| `content` | TEXT | N | 이 버전의 본문(필수) |
| `note` | TEXT | Y | 변경 요약 메모(예: 지원동기 보강) |
| `source` | TEXT | N | 출처: `manual` / `upload` / `ai` / `edit`. 기본 `'ai'` |
| `created_at` | TEXT | N | 생성 시각(ISO) |

> `updated_at`이 없다. 버전 본문은 불변(append-only) 이력으로 다룬다.

### 8. `jobs`

채용 공고.

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `company` | TEXT | N | 회사명(필수) |
| `position` | TEXT | N | 직무/포지션명(필수) |
| `url` | TEXT | Y | 공고 URL |
| `location` | TEXT | Y | 근무지 |
| `employment_type` | TEXT | Y | 고용 형태 |
| `description` | TEXT | Y | 공고 원문 또는 정리된 텍스트 |
| `requirements` | TEXT **(JSON)** | N | 자격요건/우대사항 핵심 문자열 배열. 기본 `[]` |
| `keywords` | TEXT **(JSON)** | N | 핵심 키워드 문자열 배열. 기본 `[]` |
| `deadline` | TEXT | Y | 마감일(`YYYY-MM-DD`) |
| `source` | TEXT | Y | 출처(사람인/원티드/직접 입력 등) |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 9. `fit_analyses`

특정 공고에 대한 적합도 분석. **공고당 여러 건 가능**(분석 이력 누적). `job_id`로 연결된다.

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `job_id` | TEXT | N | 분석 대상 공고(`jobs.id`). 필수 |
| `score` | REAL | Y | 종합 적합도 `0~100` |
| `summary` | TEXT | Y | 한두 문단 요약 |
| `strengths` | TEXT **(JSON)** | N | 강점/잘 맞는 부분 문자열 배열. 기본 `[]` |
| `gaps` | TEXT **(JSON)** | N | 부족한 부분/보완 필요 문자열 배열. 기본 `[]` |
| `matched_keywords` | TEXT **(JSON)** | N | 매칭 키워드 문자열 배열. 기본 `[]` |
| `missing_keywords` | TEXT **(JSON)** | N | 누락 키워드 문자열 배열. 기본 `[]` |
| `recommendations` | TEXT **(JSON)** | N | 자기소개서/지원 전략 제안 문자열 배열. 기본 `[]` |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

### 10. `applications`

지원 현황. **공고당 정확히 1건**(`job_id`에 `UNIQUE` 제약).

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `job_id` | TEXT | N, **UNIQUE** | 대상 공고(`jobs.id`). 공고당 1건 |
| `status` | TEXT | N | 지원 상태(8단계). 기본 `'draft'`. → [지원 상태](#지원-상태-8단계) |
| `resume_id` | TEXT | Y | 사용한 이력서(`documents.id`) |
| `cover_letter_id` | TEXT | Y | 사용한 자기소개서(`cover_letters.id`) |
| `applied_at` | TEXT | Y | 지원 완료 시각 |
| `notes` | TEXT | Y | 메모 |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

#### 지원 상태 8단계

`packages/shared/src/enums.ts`의 `APPLICATION_STATUSES`.

| 코드 | 라벨 |
|------|------|
| `draft` | 작성 중 |
| `planned` | 지원 예정 |
| `applied` | 지원 완료 |
| `document_passed` | 서류 합격 |
| `interview` | 면접 진행 |
| `final_passed` | 최종 합격 |
| `rejected` | 불합격 |
| `on_hold` | 보류 |

- 칸반 보드 표시 순서(`APPLICATION_BOARD_ORDER`): `draft → planned → applied → document_passed → interview → final_passed → on_hold → rejected`.
- **면접 준비 해금**(`INTERVIEW_UNLOCK_STATUSES`): `document_passed`, `interview`, `final_passed` 중 하나에 도달하면 면접 준비 단계가 열린다.

### 11. `interview_preps`

면접 준비 자료. **공고당 정확히 1건**(`job_id`에 `UNIQUE` 제약).

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `job_id` | TEXT | N, **UNIQUE** | 대상 공고(`jobs.id`). 공고당 1건 |
| `questions` | TEXT **(JSON)** | N | 예상 질문 객체 배열. 기본 `[]` |
| `star_guides` | TEXT **(JSON)** | N | STAR 정리 객체 배열. 기본 `[]` |
| `self_introduction` | TEXT | Y | 1분 자기소개 초안 |
| `notes` | TEXT | Y | 면접 후기/메모 |
| `created_at` | TEXT | N | 생성 시각(ISO) |
| `updated_at` | TEXT | N | 수정 시각(ISO) |

JSON 컬럼 내부 객체 구조(zod):

- `questions[]` = `{ question, intent?, followups?: string[], answer_outline? }`
- `star_guides[]` = `{ question, situation?, task?, action?, result? }`

### 12. `activities`

활동 피드(타임라인). `list_recent_activity` 도구와 대시보드 Home에 표시된다.

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `id` | TEXT | PK | 기본키 |
| `type` | TEXT | N | 활동 유형(아래) |
| `entity_type` | TEXT | Y | 관련 엔티티 종류(아래) |
| `entity_id` | TEXT | Y | 관련 엔티티 ID |
| `summary` | TEXT | N | 요약 문구(필수) |
| `created_at` | TEXT | N | 생성 시각(ISO) |

활동 유형(`ACTIVITY_TYPES`): `profile_updated`, `resume_added`, `cover_letter_added`, `cover_letter_version_saved`, `job_saved`, `fit_analysis_saved`, `application_status_changed`, `interview_prep_saved`, `document_exported`.

엔티티 종류(`ENTITY_TYPES`): `profile`, `experience`, `project`, `skill`, `document`, `cover_letter`, `job`, `application`, `fit_analysis`, `interview_prep`.

### `_meta` (메타)

| 컬럼 | 타입 | NULL | 의미 |
|------|------|------|------|
| `key` | TEXT | PK | 메타 키(예: `schema_version`) |
| `value` | TEXT | N | 값(문자열) |

마이그레이션 러너가 `schema_version` 키로 현재 스키마 버전을 추적한다. → [마이그레이션](#마이그레이션)

---

## 엔티티 관계 (ER)

핵심 관계는 **공고(`jobs`)를 중심**으로 적합도 분석·지원·면접 준비가 연결되고, **자기소개서(`cover_letters`)가 버전 이력(`cover_letter_versions`)을 가진다**는 두 축이다.

연결은 애플리케이션 레벨의 외래키 의미(`*_id` 컬럼)로 표현된다. SQLite 스키마에 명시적 `FOREIGN KEY` 제약은 선언되어 있지 않으며, 무결성은 코어 use-case 계층에서 관리한다. 단, `applications.job_id`와 `interview_preps.job_id`는 `UNIQUE` 제약으로 "공고당 1건"을 DB가 직접 보장한다.

```
                         ┌──────────────────┐
                         │      jobs        │  (채용 공고)
                         │  PK id           │
                         └───────┬──────────┘
                                 │ job_id
        ┌────────────────────────┼───────────────────────────┐
        │ (1 : N)                │ (1 : 1, UNIQUE)            │ (1 : 1, UNIQUE)
        ▼                        ▼                            ▼
┌──────────────────┐   ┌──────────────────┐         ┌──────────────────┐
│  fit_analyses    │   │  applications    │         │ interview_preps  │
│  PK id           │   │  PK id           │         │  PK id           │
│  FK job_id       │   │  FK job_id  (UQ) │         │  FK job_id  (UQ) │
│  (공고당 N건,     │   │  resume_id ─────────┐      │ (서류합격↑ 해금)  │
│   분석 이력)      │   │  cover_letter_id ───┼──┐   └──────────────────┘
└──────────────────┘   └──────────────────┘  │  │
                                              │  │
                       ┌──────────────────┐   │  │
                       │   documents      │◄──┘  │   resume_id → documents.id
                       │   PK id          │      │   (이력서/경력기술서 등)
                       └──────────────────┘      │
                                                 │
        ┌──────────────────┐                     │
        │  cover_letters   │◄────────────────────┘  cover_letter_id
        │  PK id           │                        → cover_letters.id
        │  job_id ─────────────► jobs.id (선택 연결)
        │  current_version_id ─┐
        └─────────┬────────────┘
                  │ (1 : N)     │ current_version_id → cover_letter_versions.id
                  ▼             │ (현재 버전 포인터)
        ┌────────────────────────┐
        │ cover_letter_versions  │  (버전별 본문 이력, append-only)
        │  PK id                 │
        │  FK cover_letter_id    │
        │  version_no (1,2,3…)   │
        └────────────────────────┘

  독립 테이블(특정 공고에 직접 묶이지 않음):
    profile · experiences · projects · skills · activities
    → 프로필/경력/프로젝트/기술은 지원 컨텍스트(get_application_context)로 모여
      AI가 분석·작성 시 함께 읽힌다. activities는 전 엔티티의 활동 로그.
```

관계 요약:

| 관계 | 카디널리티 | 연결 컬럼 | 비고 |
|------|-----------|-----------|------|
| `jobs` → `fit_analyses` | 1 : N | `fit_analyses.job_id` | 공고당 분석 이력 누적 |
| `jobs` → `applications` | 1 : 1 | `applications.job_id` (UNIQUE) | 공고당 지원 1건 |
| `jobs` → `interview_preps` | 1 : 1 | `interview_preps.job_id` (UNIQUE) | 공고당 면접준비 1건 |
| `jobs` → `cover_letters` | 1 : N | `cover_letters.job_id` (선택) | 공고에 자기소개서 연결(선택적) |
| `cover_letters` → `cover_letter_versions` | 1 : N | `cover_letter_versions.cover_letter_id` | 버전 이력 |
| `cover_letters` → 현재 버전 | 1 : 1 | `cover_letters.current_version_id` | 현재 버전 포인터 |
| `applications` → `documents` | N : 1 | `applications.resume_id` | 사용한 이력서 |
| `applications` → `cover_letters` | N : 1 | `applications.cover_letter_id` | 사용한 자기소개서 |

---

## JSON 텍스트 컬럼

다음 컬럼은 SQLite에 **JSON 문자열(`TEXT`)** 로 저장되고, 레포지토리가 파싱해 배열/객체로 반환한다. SQLite 선언상 기본값은 빈 배열 `'[]'`이다.

| 테이블 | 컬럼 | 파싱 후 형태 |
|--------|------|--------------|
| `profile` | `desired_roles` | `string[]` |
| `profile` | `emphasis_points` | `string[]` |
| `profile` | `links` | `{ label, url }[]` |
| `experiences` | `achievements` | `string[]` |
| `experiences` | `tech` | `string[]` |
| `projects` | `highlights` | `string[]` |
| `projects` | `tech` | `string[]` |
| `documents` | `tags` | `string[]` |
| `jobs` | `requirements` | `string[]` |
| `jobs` | `keywords` | `string[]` |
| `fit_analyses` | `strengths` / `gaps` / `matched_keywords` / `missing_keywords` / `recommendations` | 각 `string[]` |
| `interview_preps` | `questions` | `{ question, intent?, followups?, answer_outline? }[]` |
| `interview_preps` | `star_guides` | `{ question, situation?, task?, action?, result? }[]` |

> boolean 컬럼(`is_current`, `documents.is_primary`, `cover_letters.is_primary`)은 JSON이 아니라 `INTEGER`(0/1)로 저장되고 boolean으로 변환된다.

---

## 마이그레이션

마이그레이션 러너는 `packages/db/src/schema.ts`에 있다.

- **버전 추적**: `_meta` 테이블의 `schema_version` 키에 현재 적용된 버전 번호를 저장한다.
- **마이그레이션 정의**: `MIGRATIONS` 배열의 각 원소가 하나의 버전(순서대로 적용되는 SQL 문자열)이다. 현재 v1(초기 스키마) 한 개이며, `MIGRATIONS.length`가 목표 버전이 된다.
- **멱등성**: 모든 `CREATE TABLE` / `CREATE INDEX`는 `IF NOT EXISTS`로 작성되어 있다. 따라서 `migrate()`는 **매 프로세스 시작마다 호출해도 안전**하다. 웹 서버와 MCP 서버가 각자 부팅 시 호출해도 충돌 없이 같은 DB 파일을 공유한다.
- **동작**:
  1. `_meta`를 없으면 생성.
  2. 저장된 `schema_version`을 `from`으로 읽는다(없으면 0).
  3. `from`부터 `MIGRATIONS.length`까지 미적용 마이그레이션을 순서대로 `exec`한다.
  4. 버전이 바뀌었으면 `schema_version`을 `to = MIGRATIONS.length`로 upsert한다.
  5. `{ from, to }`를 반환한다.
- **새 버전 추가 방법**: `MIGRATIONS` 배열 끝에 새 SQL 문자열을 추가한다. 기존 원소는 절대 수정/삭제하지 않는다(이미 적용된 환경과의 호환을 위해). 컬럼 변경은 `ALTER TABLE ... ADD COLUMN` 등 전방향(forward-only)으로 작성한다.

마이그레이션은 `npm run migrate` 스크립트로 단독 실행할 수도 있다.

---

## 인덱스

`packages/db/src/schema.ts` v1에서 생성하는 인덱스:

| 인덱스 | 대상 | 목적 |
|--------|------|------|
| `idx_fit_job` | `fit_analyses(job_id)` | 공고별 적합도 분석 조회 |
| `idx_clv_letter` | `cover_letter_versions(cover_letter_id)` | 자기소개서별 버전 조회 |
| `idx_cl_job` | `cover_letters(job_id)` | 공고에 연결된 자기소개서 조회 |
| `idx_activities_created` | `activities(created_at DESC)` | 최근 활동 정렬 조회 |

---

## 데이터 저장 위치

경로 결정 로직은 `packages/db/src/paths.ts`에 있다.

- **데이터 디렉터리** (`getDataDir`):
  1. 환경변수 `CAREERMATE_DATA_DIR`(절대 경로)가 있으면 그 값을 사용.
  2. 없으면 기본값 `~/.careermate`(홈 디렉터리 하위).
  - 디렉터리는 없으면 자동 생성된다(`mkdir -p` 동작).
- **DB 파일** (`getDbPath`): `{dataDir}/careermate.sqlite`
- **하위 디렉터리**(자동 생성):

| 함수 | 경로 | 용도 |
|------|------|------|
| `getExportsDir` | `{dataDir}/exports` | 내보낸 문서(이력서/자기소개서/면접 준비 등) |
| `getUploadsDir` | `{dataDir}/uploads` | 업로드 원본 파일 |
| `getBackupsDir` | `{dataDir}/backups` | 백업(SQLite 스냅샷 + JSON 덤프) |

런타임 핸드셰이크용 `server.json`도 데이터 디렉터리에 놓인다(대시보드/MCP가 같은 DB·포트를 찾도록).

> 모든 데이터는 사용자 컴퓨터에만 저장된다. 클라우드 전송이나 외부 서버는 없다.

---

## 백업 / 내보내기

데이터 관리 로직은 `apps/web/src/settings.ts`(Settings 페이지가 호출)에 있다.

- **전체 덤프** (`exportAll`): 12개 테이블 전체를 SELECT해 `{ exported_at, version, tables }` 형태의 기계 판독 JSON으로 반환한다(포터블 백업 / 데이터 이동용).
- **백업 생성** (`createBackup`): `{backups}/careermate-{timestamp}.sqlite` + `{backups}/careermate-{timestamp}.json` 두 파일을 만든다.
  - SQLite 일관 스냅샷은 `VACUUM INTO`로 생성하며, 실패 시 파일 복사(`copyFileSync`)로 폴백한다.
  - 타임스탬프는 ISO 문자열의 `:`·`.`을 `-`로 치환한 형태.
- **백업 목록** (`listBackups`): backups 디렉터리의 `.sqlite`/`.json` 파일을 최신순으로 나열(파일명/경로/크기/생성시각).
- **전체 초기화** (`resetAll`): 확인 문자열 `"DELETE"`가 정확히 일치할 때만 동작. **삭제 전 항상 자동 백업**을 만든 뒤 12개 테이블을 `DELETE`(트랜잭션, 실패 시 롤백)한다.
- **저장 위치 표시** (`getDataLocation`): 현재 `data_dir`/`db_path`를 반환(Settings 페이지에서 노출).

문서 형태의 내보내기(이력서/자기소개서/면접 준비 → Markdown 또는 인쇄용 HTML)는 `packages/exporters`가 담당한다. HTML은 브라우저의 "인쇄 → PDF로 저장" 전략을 위한 독립형·인쇄 최적화 문서다. 내보낸 파일은 `exports/` 디렉터리에 보관된다.
