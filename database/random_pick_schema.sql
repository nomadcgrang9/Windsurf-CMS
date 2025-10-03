-- 뽑기 카테고리 테이블
CREATE TABLE IF NOT EXISTS random_pick_categories (
  id SERIAL PRIMARY KEY,
  category_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 예시 데이터 삽입
INSERT INTO random_pick_categories (category_name, items) VALUES
  ('칭찬 스티커', '["별 스티커", "하트 스티커", "왕관 스티커", "무지개 스티커"]'::jsonb),
  ('간식 쿠폰', '["초콜릿", "사탕", "과자", "음료수"]'::jsonb),
  ('자리 이동권', '["창가 자리", "앞자리", "뒷자리", "친구 옆자리"]'::jsonb),
  ('특별 권한', '["숙제 면제권", "발표 패스권", "청소 면제권", "자유 시간"]'::jsonb);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_random_pick_active ON random_pick_categories(is_active);

-- RLS (Row Level Security) 활성화
ALTER TABLE random_pick_categories ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 읽기 가능
CREATE POLICY "Anyone can read active categories"
  ON random_pick_categories
  FOR SELECT
  USING (is_active = true);

-- 정책: 인증된 사용자만 수정 가능 (Admin)
CREATE POLICY "Authenticated users can update categories"
  ON random_pick_categories
  FOR ALL
  USING (auth.role() = 'authenticated');
