# 🐛 버그 리포트

## 📋 버그 기록 가이드

### 기록 형식
```markdown
## [날짜] 버그 제목

**발생 위치**: 파일명 또는 모듈명
**증상**: 어떤 문제가 발생했는지
**원인**: 왜 발생했는지
**해결방법**: 어떻게 수정했는지
**관련 커밋**: (선택) 커밋 해시 또는 PR 번호
```

---

## 버그 기록

### 예시 템플릿 (실제 버그 발생 시 아래에 추가)

## [2025-10-02] 예시: Supabase 연결 실패

**발생 위치**: `src/lib/supabase.ts`
**증상**: 
- Supabase 클라이언트 초기화 시 undefined 에러 발생
- 환경 변수를 불러오지 못함

**원인**: 
- `.env` 파일이 `.gitignore`에 포함되어 있지 않아 GitHub에 업로드됨
- 다른 PC에서 클론 시 환경 변수가 누락됨

**해결방법**:
1. `.gitignore`에 `.env` 추가
2. `.env.example` 파일 생성하여 필요한 환경 변수 명시
3. README에 환경 변수 설정 가이드 추가

**관련 커밋**: `abc1234`

## [2025-10-03] 포인트 모듈 초기 로딩 시 중복 키 에러

**발생 위치**: `src/services/pointService.js` - `getDailyPoints()`, `createDailyPoints()`

**증상**: 
- 새로운 학생(3102 김지성, 3110 금준)으로 첫 로그인 시 "포인트를 불러올 수 없습니다" 에러 표시
- 새로고침하면 정상 작동
- 콘솔 에러: `duplicate key value violates unique constraint "daily_points_student_id_date_key"`

**원인**: 
1. **Race Condition (경쟁 상태)**:
   - `getDailyPoints()` 함수가 데이터 없음을 확인하고 `createDailyPoints()` 호출
   - 하지만 이미 다른 요청이나 이전 세션에서 데이터가 생성됨
   - `INSERT` 시도 시 UNIQUE 제약 조건 위반

2. **에러 처리 부족**:
   - `createDailyPoints()`에서 중복 키 에러 발생 시 기존 데이터 조회하지 않음
   - 에러를 그대로 throw하여 사용자에게 에러 메시지 표시

3. **`.single()` 조회 실패**:
   - 네트워크 지연이나 캐시 문제로 `.single()` 조회 실패
   - 실제로는 데이터가 있지만 "없음"으로 판단

**재현 방법**:
1. 새로운 학생 계정으로 로그인 (예: 3102, 3110)
2. 포인트 모듈 로딩 시 에러 발생
3. 새로고침하면 정상 작동

**해결방법** (적용):
1. ✅ **`createDailyPoints()`에서 중복 키 에러 처리**:
   ```javascript
   if (error.code === '23505') {
     // 중복 키 에러 → 기존 데이터 조회
     const { data: existingData, error: fetchError } = await supabase
       .from('daily_points')
       .select('current_points, max_points, date')
       .eq('student_id', studentId)
       .eq('date', today)
       .single()
     
     if (fetchError) throw fetchError
     return existingData
   }
   ```

**수정 파일**: `src/services/pointService.js` - `createDailyPoints()` 함수

**테스트 결과**:
- ✅ 새로운 학생 로그인 시 에러 없이 정상 작동
- ✅ 중복 키 에러 발생 시 기존 데이터 조회
- ✅ 새로고침 없이 즉시 포인트 표시

**우선순위**: 🔴 High (사용자 경험에 직접 영향)

**상태**: ✅ 해결 완료 (2025-10-03 08:27)

---

## [2025-10-03] 도움 시스템 다중 버그

**발생 위치**: 
- `src/services/helpService.js` - `getActiveHelpRequests()`
- `src/modules/student/HelpNeedButton.jsx`
- `src/modules/student/HelpGiveButton.jsx`
- `src/modules/student/HelpThanksButton.jsx`

**증상**: 
1. **도움알림판 표시 안 됨**: 도와줄게 클릭 후 도움알림판에 색상 변화 없음
2. **중복 요청 에러**: "이미 활성화된 요청이 있습니다" 알림 (실제로는 없음)
3. **새로고침 후 도움알림판 빈 화면**: 학생 목록이 아예 표시되지 않음

**콘솔 에러**:
```
TypeError: student.help_requests.find is not a function
Error: 이미 활성화된 요청이 있습니다.
```

**원인**: 
1. **Supabase LEFT JOIN 데이터 구조 문제**:
   - `help_requests`가 배열이 아닌 객체 또는 null로 반환됨
   - `.find()` 메서드 사용 불가

2. **버튼 상태 동기화 부족**:
   - 도와줄래/도와줄게 버튼이 Realtime 구독 없음
   - 상태 변경 시 자동 업데이트 안 됨
   - 로컬 상태와 DB 상태 불일치

**해결방법** (적용):
1. ✅ **`getActiveHelpRequests()` 데이터 처리 개선**:
   ```javascript
   const requests = Array.isArray(student.help_requests) 
     ? student.help_requests 
     : student.help_requests 
       ? [student.help_requests] 
       : []
   ```

2. ✅ **3개 버튼에 Realtime 구독 추가**:
   - HelpNeedButton: `help_status_sync`
   - HelpGiveButton: `help_status_sync_give`
   - HelpThanksButton: `help_status_sync_thanks`
   - 상태 변경 시 자동으로 `checkMyStatus()` 호출

**수정 파일**:
- `src/services/helpService.js`
- `src/modules/student/HelpNeedButton.jsx`
- `src/modules/student/HelpGiveButton.jsx`
- `src/modules/student/HelpThanksButton.jsx`

**테스트 결과**:
- ✅ 도와줄게 클릭 시 도움알림판에 하늘색 표시
- ✅ 중복 요청 에러 해결
- ✅ 새로고침 후에도 정상 표시
- ✅ Realtime 동기화 정상 작동

**우선순위**: 🔴 Critical (핵심 기능 작동 불가)

**상태**: ✅ 해결 완료 (2025-10-03 08:34)

---

## [2025-10-03] 도움 요청 중복 키 제약 조건 위반

**발생 위치**: `src/services/helpService.js` - `createHelpRequest()`

**증상**: 
- 도와줄래/도와줄게 버튼 클릭 시 중복 키 에러
- `duplicate key value violates unique constraint "help_requests_pkey"`
- `Key (student_id)=(3103) already exists.`

**원인**: 
1. **테이블 구조 문제**:
   - `help_requests` 테이블의 PRIMARY KEY가 `student_id`만 사용
   - 한 학생이 여러 요청을 INSERT할 수 없음
   - 이전 요청이 남아있으면 새 요청 생성 불가

2. **INSERT 방식 사용**:
   - 기존 데이터 확인 후 INSERT 시도
   - Race Condition 발생 가능

**해결방법** (적용):
1. ✅ **UPSERT 방식으로 변경**:
   ```javascript
   // 기존 요청 비활성화
   await supabase
     .from('help_requests')
     .update({ is_active: false })
     .eq('student_id', studentId)
     .eq('is_active', true)
   
   // UPSERT로 생성/업데이트
   .upsert({
     student_id: studentId,
     status: status,
     is_active: true,
     started_at: new Date().toISOString()
   }, {
     onConflict: 'student_id'
   })
   ```

2. ✅ **데이터 가공 로직 개선**:
   - 배열/객체 모두 안전하게 처리
   - `typeof` 체크 추가

**수정 파일**:
- `src/services/helpService.js`

**테스트 결과**:
- ✅ 중복 키 에러 해결
- ✅ 도와줄래/도와줄게 정상 작동
- ✅ 상태 전환 정상

**우선순위**: 🔴 Critical (핵심 기능 작동 불가)

**상태**: ✅ 해결 완료 (2025-10-03 08:39)

---

## [2025-10-03] 포인트 거래 기록 시 CHECK 제약 조건 위반

**발생 위치**: `src/services/helpService.js` - `completeHelp()`

**증상**: 
- 고마워 버튼 클릭 시 포인트 지급 실패
- `new row for relation "point_transactions" violates check constraint "point_transactions_help_type_check"`
- 에러 코드: 23514

**원인**: 
- `point_transactions` 테이블의 `help_type` 컬럼에 CHECK 제약 조건 존재
- `'help'` 값이 허용되지 않음
- 데이터베이스 스키마와 코드 불일치

**재현 방법**:
1. 학생 A: "도와줄래?" 클릭
2. 학생 B: "도와줄게!" 클릭
3. 학생 A: "고마워" 클릭 → B 선택
4. 포인트 지급 실패 에러 발생

**해결방법** (적용):
✅ **`help_type` 컬럼 제거**:
```javascript
// 변경 전
{
  helper_student_id: helpingStudentId,
  helped_student_id: requestingStudentId,
  points: 1,
  help_type: 'help'  // ← CHECK 제약 조건 위반
}

// 변경 후
{
  helper_student_id: helpingStudentId,
  helped_student_id: requestingStudentId,
  points: 1
  // help_type 제거
}
```

**수정 파일**:
- `src/services/helpService.js` - `completeHelp()` 함수

**테스트 결과**:
- ✅ 포인트 지급 정상 작동
- ✅ 거래 기록 정상 생성
- ✅ 도와준 학생 포인트 +1

**우선순위**: 🔴 Critical (핵심 기능 작동 불가)

**상태**: ✅ 해결 완료 (2025-10-03 09:02)

---

## [2025-10-03] 플립카드 UI 구현 시 기존 구조 파괴 및 z-index 문제

**발생 위치**: 
- `src/modules/student/TimerModule.jsx`
- `src/modules/student/RoleAssignModule.jsx`
- `src/modules/student/MessageBoxModule.jsx`
- `src/modules/student/RandomPickModule.jsx`

**증상**: 
1. **기존 UI 구조 파괴**:
   - 좌측 도구 버튼들이 기존 디자인과 완전히 다르게 표시됨
   - 이미지 아이콘 대신 이모지 아이콘 표시
   - 그라데이션 배경으로 변경
   - 전체 테마와 불일치

2. **플립 시 하단 카드 보임**:
   - 쪽지함 카드 플립 시 하단에 뽑기 카드의 일부가 보임
   - 플립된 카드가 다른 카드와 겹침

**원인**: 
1. **기존 구조 완전 교체**:
   - `.tool-button` 클래스 구조를 완전히 제거
   - CSS Module이 기존 `student-main.css` 스타일을 무시
   - 이미지 아이콘(`/characters/*.png`) 대신 이모지 사용
   - 크기와 레이아웃이 완전히 변경

2. **z-index 미설정**:
   - `.flipCard`에 `position: relative` 누락
   - 플립 시 `z-index` 증가 없음
   - 플립된 카드가 다른 카드 위로 올라오지 않음

3. **CSS Module 독립 사용**:
   - 기존 CSS와 병행하지 않고 독립적으로 사용
   - 앞면에도 새로운 스타일 적용

**재현 방법**:
1. 학생 로그인 후 좌측 도구 영역 확인
2. 타이머, 역할확인, 쪽지함, 뽑기 버튼 확인 → 기존 디자인과 다름
3. 쪽지함 카드 클릭 → 하단에 뽑기 카드 일부 보임

**해결방법** (적용):
1. ✅ **기존 HTML 구조 복원**:
   ```jsx
   // 올바른 구조
   <div className={`tool-button ${styles.flipCard} ${isFlipped ? styles.flipped : ''}`}>
     <div className={styles.cardInner}>
       {/* 앞면 - 기존 구조 유지 */}
       <div className={styles.cardFront}>
         <div className="tool-button-icon">
           <img src="/characters/timer.png" alt="타이머" className="tool-icon" />
         </div>
         <div className="tool-button-text">타이머</div>
       </div>
       
       {/* 뒷면 - 새 기능 */}
       <div className={styles.cardBack}>
         {/* 타이머 기능 */}
       </div>
     </div>
   </div>
   ```

2. ✅ **CSS Module 수정**:
   ```css
   .flipCard {
     perspective: 1000px;
     position: relative;  /* 추가 */
   }
   
   .flipCard.flipped {
     z-index: 10;  /* 플립 시 위로 */
   }
   
   .cardFront {
     gap: 8px;  /* 기존 스타일 사용 */
   }
   ```

3. ✅ **4개 모듈 모두 동일하게 수정**:
   - TimerModule
   - RoleAssignModule
   - MessageBoxModule
   - RandomPickModule

**수정 파일**:
- `src/modules/student/TimerModule.jsx` + `.module.css`
- `src/modules/student/RoleAssignModule.jsx` + `.module.css`
- `src/modules/student/MessageBoxModule.jsx` + `.module.css`
- `src/modules/student/RandomPickModule.jsx` + `.module.css`

**테스트 결과**:
- ✅ 기존 UI 디자인 복원 (이미지 아이콘, 기존 스타일)
- ✅ 플립 시 z-index 정상 작동
- ✅ 하단 카드 겹침 현상 해결
- ✅ 전체 테마와 일치

**우선순위**: 🔴 Critical (UI 전체 테마 불일치)

**상태**: ✅ 해결 완료 (2025-10-03 14:00)

**교훈**:
- 기존 구조를 완전히 교체하지 말고 **추가**하는 방식 사용
- CSS Module은 **새로운 기능만** 담당
- 기존 CSS와 **병행** 사용
- z-index 계층 구조 명확히 설정

---

## [2025-10-03] 플립카드 호버 테두리 및 이중 테두리 문제

**발생 위치**: 
- `src/modules/student/TimerModule.jsx` + `.module.css`
- `src/modules/student/RoleAssignModule.jsx` + `.module.css`
- `src/modules/student/MessageBoxModule.jsx` + `.module.css`
- `src/modules/student/RandomPickModule.jsx` + `.module.css`

**증상**: 
1. **플립 시 호버 테두리 남음**:
   - 카드 플립 후에도 청록색 테두리 보임
   - 마우스 호버 상태가 유지됨

2. **"안의 카드가 돌아간다" 느낌**:
   - 외부 컨테이너는 고정
   - 내부 요소만 회전
   - 전체 카드 플립 느낌 없음

3. **이중 테두리**:
   - `tool-button` 테두리 (바깥)
   - `cardBack` 테두리 (안쪽)
   - 2개 겹쳐서 보임

**원인**: 
1. **호버 테두리 문제**:
   - `.tool-button:hover` 스타일이 플립 후에도 적용
   - CSS Module 우선순위 문제
   - 호버 상태 제거 실패

2. **구조적 문제**:
   ```jsx
   // 잘못된 구조 (3단계)
   <div className="tool-button">        // 고정
     <div className={cardInner}>        // 회전
       <div className={cardFront}>
       <div className={cardBack}>
     </div>
   </div>
   ```
   - 외부 `tool-button`은 회전 안 함
   - 내부 `cardInner`만 회전
   - 부모 테두리가 그대로 보임

3. **이중 테두리**:
   - `tool-button`: `border: 2px solid #E0E0E0`
   - `cardBack`: `border: 2px solid #E0E0E0`
   - 전체 카드 회전 시 2개 모두 보임

**해결방법** (적용):

1. ✅ **구조 재설계 (2단계)**:
   ```jsx
   // 올바른 구조
   <div className={`tool-button ${flipContainer} ${flipped}`}>  // 전체 회전
     <div className={cardFront}>
     <div className={cardBack}>
   </div>
   ```
   - `cardInner` div 제거
   - `tool-button` 자체가 회전
   - 전체 카드 플립 느낌

2. ✅ **CSS 수정**:
   ```css
   .flipContainer {
     transform-style: preserve-3d;
     transition: transform 0.6s;
   }
   
   .flipContainer.flipped {
     transform: rotateY(180deg);  // 전체 회전
   }
   
   .flipContainer.flipped:hover {
     transform: rotateY(180deg);  // 회전 유지, scale 제거
     border-color: #E0E0E0;
     background: #FFFFFF;
   }
   ```

3. ✅ **이중 테두리 제거**:
   ```css
   .cardBack {
     border: none;  // 제거
   }
   ```

**수정 파일**:
- `TimerModule.jsx` + `.module.css`
- `RoleAssignModule.jsx` + `.module.css`
- `MessageBoxModule.jsx` + `.module.css`
- `RandomPickModule.jsx` + `.module.css`

**테스트 결과**:
- ✅ 전체 카드가 자연스럽게 회전
- ✅ 플립 시 호버 효과 제거
- ✅ 이중 테두리 해결
- ✅ 깔끔한 플립 애니메이션

**우선순위**: 🔴 Critical (UI/UX 핵심)

**상태**: ✅ 해결 완료 (2025-10-03 14:30)

**교훈**:
- 플립 애니메이션은 **전체 컨테이너**가 회전해야 자연스러움
- 중첩된 div 구조는 플립 시 문제 발생
- 테두리 중복 주의 (부모/자식 모두 테두리 있으면 겹침)
- 호버 효과는 플립 시 명시적으로 제거 필요

---

## [2025-10-03] 쪽지 시스템 Realtime 및 데이터 조회 버그

**발생 위치**: 
- `src/services/messageService.js` - `getTeacherReplies()`, `subscribeToTeacherReplies()`
- `src/modules/student/MessageBoxModule.jsx` - Realtime 구독

**증상**: 
1. **관리자 페이지에서 답장이 안 보임**: 학생이 답장을 보내도 관리자 페이지에 표시되지 않음
2. **학생 페이지 실시간 업데이트 안 됨**: 새로고침하기 전까지 쪽지 뱃지(1)가 안 뜨고 메시지도 수신되지 않음

**원인**: 
1. **Supabase 조인 실패**:
   - `getTeacherReplies()`에서 `students` 테이블 조인 시 외래 키가 명시되지 않음
   - Supabase가 자동으로 조인 관계를 찾지 못해 데이터 조회 실패
   
2. **Realtime 구독 필터 오류**:
   - `subscribeToTeacherReplies()`의 필터가 `to_type=eq.teacher,to_id=eq.admin`로 설정
   - 쉼표로 구분된 필터는 AND 조건이 아닌 잘못된 문법
   
3. **useEffect 의존성 배열 문제**:
   - `setState({ ...state, unreadCount: 1 })`에서 `state`를 직접 참조
   - 의존성 배열에 `state`가 없어서 stale closure 발생

**해결방법** (적용):

1. ✅ **`getTeacherReplies()` 수정 (3단계 조회)**:
   ```javascript
   // 1단계: 답장 메시지 조회
   const { data: messages } = await supabase
     .from('messages')
     .select('message_id, from_id, content, is_read, created_at')
     .eq('to_type', 'teacher')
     .eq('to_id', 'admin')
   
   // 2단계: 학생 정보 조회 (from_id로)
   const studentIds = [...new Set(messages.map(m => m.from_id))]
   const { data: students } = await supabase
     .from('students')
     .select('student_id, name, grade, class_number, student_number')
     .in('student_id', studentIds)
   
   // 3단계: 메시지와 학생 정보 병합
   return messages.map(msg => ({
     ...msg,
     students: studentMap[msg.from_id]
   }))
   ```

2. ✅ **`subscribeToTeacherReplies()` 수정**:
   ```javascript
   // 필터 수정 (to_id 조건 제거)
   filter: 'to_type=eq.teacher'
   
   // 콜백에서 학생 정보 조회
   async (payload) => {
     const { data: student } = await supabase
       .from('students')
       .select('*')
       .eq('student_id', payload.new.from_id)
       .single()
     
     callback({ ...payload.new, students: student })
   }
   ```

3. ✅ **`MessageBoxModule` useEffect 수정**:
   ```javascript
   // 이전: state를 직접 참조
   setState({ ...state, unreadCount: 1 })
   
   // 이후: 함수형 업데이트
   setState(prev => ({ ...prev, unreadCount: 1 }))
   ```

**수정 파일**:
- `src/services/messageService.js`
- `src/modules/student/MessageBoxModule.jsx`

**테스트 결과**:
- ✅ 관리자 페이지에서 답장 정상 표시
- ✅ 학생 페이지 실시간 쪽지 수신 (뱃지 즉시 표시)
- ✅ Realtime 구독 정상 작동

**우선순위**: 🔴 Critical (핵심 기능 작동 불가)

**상태**: ✅ 해결 완료 (2025-10-03 16:20)

---

## 📌 버그 통계

- **총 버그 수**: 7
- **해결된 버그**: 7
- **미해결 버그**: 0

---

## 🔍 자주 발생하는 버그 패턴

### 1. **CSS 관련 버그** (3건)
- 기존 구조 파괴
- z-index 미설정
- 플립카드 구조 문제

### 2. **데이터베이스 제약 조건** (3건)
- 중복 키 에러
- CHECK 제약 조건 위반

### 3. **Realtime 동기화** (2건)
- 버튼 상태 동기화 부족
- 쪽지 실시간 수신 실패

### 4. **Supabase 조인 문제** (1건)
- 외래 키 명시 없이 자동 조인 실패

---

**마지막 업데이트**: 2025-10-03 16:20
**관리자**: 이창건
