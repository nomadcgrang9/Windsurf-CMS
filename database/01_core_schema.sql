-- =====================================================
-- 핵심 테이블 스키마 (필수)
-- =====================================================
-- 작성일: 2025-11-07
-- 목적: 학생, 세션, 도움 시스템의 기본 테이블 생성
-- =====================================================

-- 1. students 테이블 (학생 정보)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL,
  class_number INTEGER NOT NULL,
  student_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. login_sessions 테이블 (로그인 세션)
CREATE TABLE IF NOT EXISTS login_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. help_requests 테이블 (도움 요청)
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('requesting', 'helping')),
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, is_active)
);

-- 4. student_points 테이블 (학생 포인트)
CREATE TABLE IF NOT EXISTS student_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL UNIQUE REFERENCES students(student_id) ON DELETE CASCADE,
  current_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. point_transactions 테이블 (포인트 거래 기록)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  helper_student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  helped_student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 1,
  help_description TEXT,
  ai_converted_description TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  transaction_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스 생성 (성능 최적화)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_grade_class ON students(grade, class_number);
CREATE INDEX IF NOT EXISTS idx_login_sessions_student_id ON login_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_active ON login_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_help_requests_student_id ON help_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_active ON help_requests(is_active);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_point_transactions_helper ON point_transactions(helper_student_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_helped ON point_transactions(helped_student_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_time ON point_transactions(transaction_time DESC);

-- =====================================================
-- RLS (Row Level Security) 비활성화
-- (학교 내부 시스템이므로 보안 위험 낮음)
-- =====================================================
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 검증 쿼리
-- =====================================================
-- 테이블 생성 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'students', 'login_sessions', 'help_requests', 'student_points', 'point_transactions'
);
