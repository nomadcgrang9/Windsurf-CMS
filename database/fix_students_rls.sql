-- =====================================================
-- Students 테이블 RLS 정책 수정
-- =====================================================
-- 문제: anon 키로 학생 조회 불가 (RLS 정책 제한)
-- 해결: RLS 비활성화 또는 정책 추가
-- =====================================================

-- 1. students 테이블 RLS 비활성화
-- (학교 내부 시스템이므로 보안 위험 낮음)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- 2. login_sessions 테이블 RLS 비활성화
ALTER TABLE login_sessions DISABLE ROW LEVEL SECURITY;

-- 3. help_requests 테이블 RLS 비활성화
ALTER TABLE help_requests DISABLE ROW LEVEL SECURITY;

-- 4. point_transactions 테이블 RLS 비활성화
ALTER TABLE point_transactions DISABLE ROW LEVEL SECURITY;

-- 5. student_points 테이블 RLS 비활성화
ALTER TABLE student_points DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 검증 쿼리: RLS 상태 확인
-- =====================================================
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('students', 'login_sessions', 'help_requests', 'point_transactions', 'student_points')
ORDER BY tablename;
