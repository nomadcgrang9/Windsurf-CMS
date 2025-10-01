# 수업관리 시스템 프로젝트 구조

## 📋 프로젝트 개요
- **프로젝트명**: 커스터마이징된 수업관리 웹서비스
- **기술스택**: Vite + React + Supabase
- **개발원칙**: 완전한 모듈화 구조
- **시작일**: 2025-10-01

## 🔑 Supabase 연동 정보
- **프로젝트 URL**: https://xhdufkgkonudblmdpclu.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZHVma2drb251ZGJsbWRwY2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMDUwOTEsImV4cCI6MjA3NDg4MTA5MX0.fxA6ptKjB0WqH4pDsabDgy4lUXYRpLkCY1AienuYs8g
- **Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZHVma2drb251ZGJsbWRwY2x1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMwNTA5MSwiZXhwIjoyMDc0ODgxMDkxfQ.73OujxvQjmT5B9RJ6L9w1TgUo80c-uhFQDPRjtpCqfg
- **프로젝트 ID**: xhdufkgkonudblmdpclu
- **연동 상태**: ✅ 테이블 생성 완료

## 🗂️ 현재 프로젝트 구조

```
class-management-system/
├── PROJECT_RULES.md          # 개발 절대규칙 문서
├── STRUCTURE.md             # 이 파일 (구조 문서)
├── package.json             # (예정) 프로젝트 의존성
├── vite.config.js           # (예정) Vite 설정
├── index.html               # (예정) 메인 HTML
├── src/                     # (예정) 소스코드 폴더
│   ├── main.jsx            # (예정) 앱 진입점
│   ├── App.jsx             # (예정) 메인 앱 컴포넌트
│   ├── pages/              # 메인 페이지들 (라우팅 단위)
│   │   ├── StudentLoginPage.jsx    # 학생 로그인 페이지
│   │   ├── StudentPage.jsx         # 학생 메인 페이지 (컨테이너)
│   │   └── AdminPage.jsx           # 관리자 페이지 (컨테이너)
│   ├── modules/            # 기능별 독립 모듈
│   │   ├── student/        # 학생 관련 모듈들
│   │   │   ├── HeaderModule.jsx           # 상단 헤더
│   │   │   ├── LearningToolsModule.jsx    # 학습도구 슬롯 (3x2)
│   │   │   ├── LearningGuideModule.jsx    # 학습안내 (30초)
│   │   │   ├── HelpSystemModule.jsx       # 도와줄래/도와줄게/고마워
│   │   │   ├── HelpStatusModule.jsx       # 도움현황 (20초)
│   │   │   └── DailyPointsModule.jsx      # 오늘의포인트
│   │   └── admin/          # 관리자 관련 모듈들
│   │       ├── AdminLoginModule.jsx       # teacher123 인증
│   │       ├── ClassManagementModule.jsx  # 학급별 학생명단
│   │       ├── LearningGuideInputModule.jsx # 학습안내 입력
│   │       └── PointManagementModule.jsx  # 포인트 관리
│   ├── components/         # 재사용 가능한 공통 컴포넌트
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   └── ui/
│   │       ├── ProgressBar.jsx    # 포인트 게이지바
│   │       └── StatusIndicator.jsx # 도움상태 표시등
│   ├── services/           # Supabase 연동 서비스
│   │   ├── authService.js         # 로그인/인증
│   │   ├── studentService.js      # 학생 데이터
│   │   ├── helpService.js         # 도움 시스템
│   │   ├── pointService.js        # 포인트 관리
│   │   └── supabaseClient.js      # Supabase 클라이언트
│   ├── utils/              # 유틸리티 함수
│   │   ├── timeUtils.js           # 시간 관련 (자정 초기화 등)
│   │   ├── formatUtils.js         # 데이터 포맷팅
│   │   └── validationUtils.js     # 입력 검증
│   └── styles/             # 스타일 파일
│       ├── global.css
│       ├── student.css
│       └── admin.css
└── supabase/               # (예정) Supabase 설정
```

## 📝 업데이트 기록

### 2025-10-01 18:00 - 프로젝트 초기 설정
- **생성된 파일**:
  - `PROJECT_RULES.md`: 개발 절대규칙 문서 생성
  - `STRUCTURE.md`: 프로젝트 구조 문서 생성 (현재 파일)

- **설정된 규칙**:
  - 절대규칙 1: Vite + Supabase + 모듈화 구조
  - 절대규칙 2: STRUCTURE.md 실시간 업데이트

### 2025-10-01 20:08 - 모듈 구조 확정 및 기능 명세
- **업데이트된 내용**:
  - 통합 모듈 구조 확정 (student/admin 폴더 분리)
  - 구현해야 할 11개 주요 기능 명세 완료
  - 학생페이지 7개 기능 + 관리자페이지 4개 기능 정의

- **확정된 기술 스펙**:
  - 타겟 환경: 13인치 크롬북, 크롬브라우저
  - 학급 구성: 3학년 3개반, 4학년 3개반, 6학년 7개반
  - 학번 형식: 4자리 (3121 = 3학년 1반 21번)
  - 포인트 시스템: 일일 20개 한도, 자정 초기화

### 2025-10-01 20:24 - Supabase 연동 정보 추가
- **업데이트된 내용**:
  - Supabase 프로젝트 연동 정보 추가
  - 데이터베이스 테이블 설계 완료 (7개 테이블)
  - 프로젝트 URL 및 Anon Key 저장

- **데이터베이스 구조**:
  - students, help_requests, daily_points, point_transactions
  - learning_guide, login_sessions, system_settings
  - 실시간 업데이트 및 인덱스 최적화 적용

### 2025-10-01 20:37 - Supabase 테이블 생성 완료
- **업데이트된 내용**:
  - Service Role Key 연동 성공
  - 7개 테이블 생성 및 구조 검증 완료
  - 데이터베이스 준비 완료

- **생성된 테이블 상세**:
  - ✅ `students`: 학생 정보 (student_id PK, name, grade, class_number, student_number)
  - ✅ `help_requests`: 도움 상태 (student_id PK/FK, status, started_at, is_active)
  - ✅ `daily_points`: 일일 포인트 (id PK, student_id FK, date, current_points, max_points)
  - ✅ `point_transactions`: 포인트 거래 (transaction_id PK, helper_student_id FK, helped_student_id FK, points, help_type)
  - ✅ `learning_guide`: 학습안내 (guide_id PK, class_info, content, created_at, updated_at)
  - ✅ `login_sessions`: 로그인 세션 (session_id PK UUID, student_id FK, login_time, expires_at 40분)
  - ✅ `system_settings`: 시스템 설정 (setting_key PK, setting_value, description)

- **검증된 기능**:
  - Foreign Key 관계 정상 설정
  - 40분 세션 자동 만료 (expires_at)
  - UUID 자동 생성 (session_id)
  - 타임스탬프 자동 업데이트
  - CHECK 제약조건 적용 (help_requests.status)

- **다음 단계**: 
  - Vite 프로젝트 초기화
  - 기본 폴더 구조 생성
  - Supabase 클라이언트 설정

## 🎯 구현해야 할 주요 기능

### 📚 학생 페이지 기능
1. **학생 로그인** (`StudentLoginPage.jsx`)
   - 학번+이름으로 로그인 (비밀번호 없음)
   - Supabase DB 연동 학생 검증
   - 하단에 관리자 로그인 버튼

2. **상단 헤더** (`HeaderModule.jsx`)
   - 좌측: "도와줄래?" 제목
   - 우측: 학번, 이름, 로그아웃 버튼

3. **학습도구 슬롯** (`LearningToolsModule.jsx`)
   - 좌측 30% 공간, 3x2 그리드
   - 상단: 타이머, 역할배정, 뽑기
   - 하단: 4, 5, 6번 슬롯 (미구현)

4. **학습안내** (`LearningGuideModule.jsx`)
   - 교사 입력 내용 실시간 반영 (30초 업데이트)
   - https 링크 클릭 시 새탭 열림

5. **도움 시스템** (`HelpSystemModule.jsx`)
   - 도와줄래/도와줄게/고마워 버튼
   - 포인트 배정: 해결됨 2pt, 고마웠음 1pt
   - 취소 기능 및 모달창

6. **도움현황** (`HelpStatusModule.jsx`)
   - 학급 접속 학생 표시 (20초 업데이트)
   - 상태별 불빛: 빨강(도와줄래), 파랑(도와줄게), 무색(일반)

7. **오늘의포인트** (`DailyPointsModule.jsx`)
   - 실시간 포인트 업데이트
   - 0/20 숫자 + 게이지바 표시
   - 한국시간 자정 자동 초기화

### 🔧 관리자 페이지 기능
1. **관리자 로그인** (`AdminLoginModule.jsx`)
   - teacher123 비밀번호 인증

2. **학급 관리** (`ClassManagementModule.jsx`)
   - 텍스트 입력으로 학급 조회 (3-1 → 3학년 1반)
   - 로그인/미로그인 학생 상태 표시

3. **학습안내 입력** (`LearningGuideInputModule.jsx`)
   - 단순 텍스트 입력
   - 학생페이지에 실시간 반영

4. **포인트 관리** (`PointManagementModule.jsx`)
   - 학생별 포인트 현황 조회
   - 텍스트 입력 검색 기능

## 🔧 기술적 구조 설명

### 모듈화 원칙
- 각 기능은 독립적인 파일로 분리
- 메인 페이지는 모듈들을 조합하는 역할만 담당
- 전역 상태 오염 방지를 위한 완전한 분리

### 파일 명명 규칙
- 페이지: `[Name]Page.jsx`
- 모듈: `[Name]Module.jsx`
- 컴포넌트: `[Name]Component.jsx`
- 서비스: `[name]Service.js`

## 🚀 개발 진행 상황

- [x] 프로젝트 규칙 정의
- [x] 구조 문서 생성
- [x] Supabase 프로젝트 설정
- [x] 데이터베이스 테이블 생성 (7개)
- [x] 테이블 구조 검증 완료
- [ ] Vite 프로젝트 초기화
- [ ] 기본 컴포넌트 구조 생성
- [ ] 학생 페이지 개발
- [ ] 각 모듈 개발

---
**마지막 업데이트**: 2025-10-01 20:37
**업데이트 내용**: Supabase 테이블 생성 완료 및 데이터베이스 구조 검증
