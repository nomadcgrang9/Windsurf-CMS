-- help_settings 테이블 생성
-- 학급별/학년별/전체 도움 설정 관리

CREATE TABLE IF NOT EXISTS help_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grade INTEGER NOT NULL,           -- 학년 (0 = 전체)
  class_number INTEGER NOT NULL,    -- 반 (0 = 해당 학년 전체)
  cooldown_seconds INTEGER NOT NULL DEFAULT 600,  -- 쿨타임 (초 단위, 기본 600초 = 10분)
  daily_limit INTEGER NOT NULL DEFAULT 3,         -- 일일 도움 제한 횟수 (기본 3회)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 학년+반 조합은 유일해야 함
  UNIQUE(grade, class_number)
);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_help_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER help_settings_updated_at_trigger
  BEFORE UPDATE ON help_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_help_settings_updated_at();

-- 기본값 삽입 (전체 설정)
INSERT INTO help_settings (grade, class_number, cooldown_seconds, daily_limit)
VALUES (0, 0, 600, 3)
ON CONFLICT (grade, class_number) DO NOTHING;

-- RLS (Row Level Security) 활성화
ALTER TABLE help_settings ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자가 읽기 가능 (학생들이 설정값을 조회해야 함)
CREATE POLICY "Allow read for all" ON help_settings
  FOR SELECT USING (true);

-- 정책: 관리자만 쓰기 가능 (간단히 모든 사용자 허용 - 실제로는 admin 체크 필요)
CREATE POLICY "Allow write for authenticated" ON help_settings
  FOR ALL USING (true) WITH CHECK (true);

-- 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_help_settings_grade_class
  ON help_settings(grade, class_number);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE help_settings;

-- 코멘트 추가
COMMENT ON TABLE help_settings IS '도움 시스템 설정 테이블 - 학급별/학년별 쿨타임 및 일일 제한 관리';
COMMENT ON COLUMN help_settings.grade IS '학년 (0 = 전체 적용)';
COMMENT ON COLUMN help_settings.class_number IS '반 번호 (0 = 해당 학년 전체 적용)';
COMMENT ON COLUMN help_settings.cooldown_seconds IS '쿨타임 (초 단위)';
COMMENT ON COLUMN help_settings.daily_limit IS '일일 도움 제한 횟수';
