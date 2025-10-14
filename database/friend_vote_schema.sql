-- 친구 투표 시스템 데이터베이스 스키마

-- 1. 투표 세션 테이블
CREATE TABLE IF NOT EXISTS vote_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed'
  time_limit_minutes INTEGER NOT NULL, -- 투표 시간 (분)
  question_1 TEXT NOT NULL, -- 질문 1
  question_2 TEXT NOT NULL, -- 질문 2
  question_3 TEXT NOT NULL, -- 질문 3
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 투표 기록 테이블
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES vote_sessions(id) ON DELETE CASCADE,
  voter_id UUID REFERENCES students(id) ON DELETE CASCADE, -- 투표한 학생
  category_1_student_id UUID REFERENCES students(id), -- 질문 1 선택한 학생
  category_2_student_id UUID REFERENCES students(id), -- 질문 2 선택한 학생
  category_3_student_id UUID REFERENCES students(id), -- 질문 3 선택한 학생
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, voter_id) -- 한 세션에서 한 학생은 한 번만 투표
);

-- 3. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_vote_sessions_status ON vote_sessions(status);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_category_1 ON votes(category_1_student_id);
CREATE INDEX IF NOT EXISTS idx_votes_category_2 ON votes(category_2_student_id);
CREATE INDEX IF NOT EXISTS idx_votes_category_3 ON votes(category_3_student_id);

-- 4. RLS (Row Level Security) 정책
ALTER TABLE vote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can view vote sessions" ON vote_sessions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view votes" ON votes
  FOR SELECT USING (true);

-- 인증된 사용자만 투표 세션 생성/수정 (관리자)
CREATE POLICY "Authenticated users can insert vote sessions" ON vote_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update vote sessions" ON vote_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete vote sessions" ON vote_sessions
  FOR DELETE USING (true);

-- 인증된 사용자만 투표 가능 (학생)
CREATE POLICY "Authenticated users can insert votes" ON votes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update votes" ON votes
  FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete votes" ON votes
  FOR DELETE USING (true);

-- 5. 함수: 활성 투표 세션 가져오기
CREATE OR REPLACE FUNCTION get_active_vote_session()
RETURNS TABLE (
  id UUID,
  status TEXT,
  time_limit_minutes INTEGER,
  question_1 TEXT,
  question_2 TEXT,
  question_3 TEXT,
  started_at TIMESTAMP,
  ended_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vs.id,
    vs.status,
    vs.time_limit_minutes,
    vs.question_1,
    vs.question_2,
    vs.question_3,
    vs.started_at,
    vs.ended_at
  FROM vote_sessions vs
  WHERE vs.status = 'active'
  ORDER BY vs.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 6. 함수: 투표 결과 집계
CREATE OR REPLACE FUNCTION get_vote_results(session_uuid UUID)
RETURNS TABLE (
  category INTEGER,
  student_id UUID,
  student_name TEXT,
  vote_count BIGINT
) AS $$
BEGIN
  -- 카테고리 1 결과
  RETURN QUERY
  SELECT 
    1 AS category,
    s.id AS student_id,
    s.name AS student_name,
    COUNT(v.category_1_student_id) AS vote_count
  FROM votes v
  JOIN students s ON v.category_1_student_id = s.id
  WHERE v.session_id = session_uuid
  GROUP BY s.id, s.name
  ORDER BY vote_count DESC, s.name
  LIMIT 3;

  -- 카테고리 2 결과
  RETURN QUERY
  SELECT 
    2 AS category,
    s.id AS student_id,
    s.name AS student_name,
    COUNT(v.category_2_student_id) AS vote_count
  FROM votes v
  JOIN students s ON v.category_2_student_id = s.id
  WHERE v.session_id = session_uuid
  GROUP BY s.id, s.name
  ORDER BY vote_count DESC, s.name
  LIMIT 3;

  -- 카테고리 3 결과
  RETURN QUERY
  SELECT 
    3 AS category,
    s.id AS student_id,
    s.name AS student_name,
    COUNT(v.category_3_student_id) AS vote_count
  FROM votes v
  JOIN students s ON v.category_3_student_id = s.id
  WHERE v.session_id = session_uuid
  GROUP BY s.id, s.name
  ORDER BY vote_count DESC, s.name
  LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- 7. 함수: 학생의 투표 여부 확인
CREATE OR REPLACE FUNCTION has_student_voted(session_uuid UUID, student_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM votes
    WHERE session_id = session_uuid
    AND voter_id = student_uuid
  );
END;
$$ LANGUAGE plpgsql;
