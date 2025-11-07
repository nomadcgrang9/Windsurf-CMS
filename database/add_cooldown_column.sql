-- =====================================================
-- help_requests 테이블에 cooldown_until 컬럼 추가
-- =====================================================
-- 목적: "도와줄게!" 10분 쿨타임 구현
-- =====================================================

-- 1. cooldown_until 컬럼 추가 (기존 테이블)
ALTER TABLE help_requests
ADD COLUMN IF NOT EXISTS cooldown_until TIMESTAMPTZ;

-- 2. 검증
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'help_requests'
ORDER BY ordinal_position;
