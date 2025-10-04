# Gemini API 설정 가이드

## 1. .env 파일에 API 키 추가

프로젝트 루트 디렉토리의 `.env` 파일을 열고 다음 줄을 추가하세요:

```env
VITE_GEMINI_API_KEY=AIzaSyAb8RN6I3JJaNTzq2hkwKbnQ-kuyv46PYu71g5iUn2thJDEd6qA
```

**중요:** 
- API 키 앞에 `VITE_` 접두사가 반드시 필요합니다 (Vite 환경 변수 규칙)
- `.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 업로드되지 않습니다
- API 키는 절대 공개하지 마세요

## 2. 개발 서버 재시작

`.env` 파일을 수정한 후에는 개발 서버를 재시작해야 합니다:

```bash
# 개발 서버 중지 (Ctrl+C)
# 개발 서버 재시작
npm run dev
```

## 3. 배포 환경 설정 (Cloudflare Pages)

Cloudflare Pages 대시보드에서 환경 변수를 추가하세요:

1. Cloudflare Pages 프로젝트 설정 접속
2. **Settings** → **Environment variables** 메뉴
3. **Add variable** 클릭
4. 변수 추가:
   - **Variable name**: `VITE_GEMINI_API_KEY`
   - **Value**: `AIzaSyAb8RN6I3JJaNTzq2hkwKbnQ-kuyv46PYu71g5iUn2thJDEd6qA`
   - **Environment**: Production (또는 Preview)
5. **Save** 클릭
6. 프로젝트 재배포

## 4. 사용 방법

### 관리자 페이지에서 AI 변환 사용

1. 관리자 페이지 접속 (`/admin`)
2. **도움내용** 탭 클릭
3. 조회 범위 입력 (예: `3-1`, `3학년`, `전체`)
4. **조회** 버튼 클릭
5. 도움 기록 테이블에서 **생기부 변환** 버튼 클릭
6. AI가 변환한 내용 확인
7. **승인** 버튼 클릭하여 최종 승인

### AI 변환 예시

**원본 (학생 작성):**
```
25+8 계산이 어려웠는데 5더하기8은 13이고 10은 받아올림되서 20+10이 된다는 것을 알려줬어요
```

**변환 후 (AI 생성):**
```
두자릿수 더하기 한자릿수 계산을 어려워하는 친구를 위해 받아올림의 계산 원리를 친절히 설명함
```

## 5. 문제 해결

### "Gemini API 키가 설정되지 않았습니다" 오류

- `.env` 파일에 `VITE_GEMINI_API_KEY`가 정확히 입력되었는지 확인
- 개발 서버를 재시작했는지 확인
- API 키 앞뒤에 공백이 없는지 확인

### "Gemini API 호출 실패" 오류

- API 키가 유효한지 확인 (Google AI Studio에서 확인)
- 인터넷 연결 상태 확인
- API 할당량이 남아있는지 확인

### 변환 결과가 이상한 경우

- `src/services/geminiService.js`의 프롬프트를 수정하여 변환 규칙 조정 가능
- `temperature` 값을 낮추면 더 일관된 결과 생성 (현재: 0.7)

## 6. API 사용량 모니터링

Google AI Studio에서 API 사용량을 확인할 수 있습니다:
- https://aistudio.google.com/app/apikey

무료 할당량:
- 분당 15회 요청
- 일일 1,500회 요청
- 월 100만 토큰

## 7. 보안 주의사항

- ❌ API 키를 코드에 직접 하드코딩하지 마세요
- ❌ API 키를 GitHub에 업로드하지 마세요
- ✅ `.env` 파일을 사용하여 안전하게 관리하세요
- ✅ `.gitignore`에 `.env`가 포함되어 있는지 확인하세요
