-- 쪽지 시스템 테이블
-- 관리자 ↔ 학생 간 양방향 메시지 전송

CREATE TABLE messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type TEXT NOT NULL CHECK (from_type IN ('teacher', 'student')),
  from_id TEXT,  -- teacher면 NULL, student면 student_id
  to_type TEXT NOT NULL CHECK (to_type IN ('teacher', 'student')),
  to_id TEXT NOT NULL,  -- teacher면 'admin', student면 student_id
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 수신자별 조회 최적화 (최신순)
CREATE INDEX idx_messages_to ON messages(to_type, to_id, created_at DESC);

-- 인덱스: 발신자별 조회 최적화
CREATE INDEX idx_messages_from ON messages(from_type, from_id);

-- RLS 정책: 비활성화 (anon 키로 모든 접근 허용)
-- 학교 내부 시스템이므로 RLS 불필요
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
