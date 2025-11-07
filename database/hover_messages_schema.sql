-- =====================================================
-- 로그인 페이지 말풍선 메시지 테이블
-- =====================================================
-- 작성일: 2025-11-07
-- 목적: 학생 로그인 페이지의 말풍선 메시지 및 이미지 관리
-- =====================================================

-- 1. hover_messages 테이블 생성
CREATE TABLE IF NOT EXISTS hover_messages (
  id INTEGER PRIMARY KEY DEFAULT 1,
  message TEXT NOT NULL DEFAULT '창건샘 말씀하시길, 나는 못하지만 친구는 할 수 있다!',
  image_url TEXT DEFAULT '/characters/nini-rogin.png',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 한 개의 레코드만 유지하도록 제약
  CONSTRAINT only_one_record CHECK (id = 1)
);

-- 2. 초기 데이터 삽입
INSERT INTO hover_messages (id, message, image_url) 
VALUES (1, '창건샘 말씀하시길, 나는 못하지만 친구는 할 수 있다!', '/characters/nini-rogin.png')
ON CONFLICT (id) DO NOTHING;

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE hover_messages ENABLE ROW LEVEL SECURITY;

-- 4. 정책: 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read hover messages"
  ON hover_messages
  FOR SELECT
  USING (true);

-- 5. 정책: 인증된 사용자(관리자)만 수정 가능
CREATE POLICY "Authenticated users can update hover messages"
  ON hover_messages
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
