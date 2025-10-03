-- 학생 역할 배정 테이블
CREATE TABLE IF NOT EXISTS student_roles (
  id SERIAL PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  role_name TEXT NOT NULL,
  assigned_by TEXT,
  assigned_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 역할 세션 테이블
CREATE TABLE IF NOT EXISTS role_sessions (
  id SERIAL PRIMARY KEY,
  session_name TEXT NOT NULL,
  roles JSONB NOT NULL DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 세션 배정 기록 테이블
CREATE TABLE IF NOT EXISTS role_assignments (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES role_sessions(id),
  session_name TEXT,
  class_name TEXT,
  student_id TEXT,
  student_name TEXT,
  assigned_role TEXT,
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- 예시 세션 데이터
INSERT INTO role_sessions (session_name, roles, created_by) VALUES
  ('마피아 게임', '["시민1", "시민2", "마피아1", "의사1"]'::jsonb, 'admin')
ON CONFLICT DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_student_roles_student_id ON student_roles(student_id);
CREATE INDEX IF NOT EXISTS idx_student_roles_active ON student_roles(is_active);

-- RLS (Row Level Security) 활성화
ALTER TABLE student_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_assignments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Anyone can read active student roles" ON student_roles;
DROP POLICY IF EXISTS "Authenticated users can manage student roles" ON student_roles;
DROP POLICY IF EXISTS "Anyone can manage student roles" ON student_roles;
DROP POLICY IF EXISTS "Anyone can read role sessions" ON role_sessions;
DROP POLICY IF EXISTS "Anyone can manage role sessions" ON role_sessions;
DROP POLICY IF EXISTS "Anyone can read role assignments" ON role_assignments;
DROP POLICY IF EXISTS "Anyone can manage role assignments" ON role_assignments;

-- 정책: 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read active student roles"
  ON student_roles
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can read role sessions"
  ON role_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read role assignments"
  ON role_assignments
  FOR SELECT
  USING (true);

-- 정책: 모든 사용자가 수정 가능 (임시 - 개발용)
CREATE POLICY "Anyone can manage student roles"
  ON student_roles
  FOR ALL
  USING (true);

CREATE POLICY "Anyone can manage role sessions"
  ON role_sessions
  FOR ALL
  USING (true);

CREATE POLICY "Anyone can manage role assignments"
  ON role_assignments
  FOR ALL
  USING (true);
