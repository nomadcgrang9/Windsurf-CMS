-- =====================================================
-- Phase 1: AI 생기부 변환 기능을 위한 컬럼 추가
-- =====================================================
-- 작성일: 2025-10-04
-- 목적: 학생이 작성한 도와준 내용을 AI로 생기부 형식으로 변환하고 교사가 승인하는 기능 추가
-- 테이블: point_transactions
-- =====================================================

-- 1. help_description 컬럼 추가 (학생이 작성한 원본 도와준 내용)
ALTER TABLE point_transactions
ADD COLUMN IF NOT EXISTS help_description TEXT;

-- 2. ai_converted_description 컬럼 추가 (AI가 생기부 형식으로 변환한 내용)
ALTER TABLE point_transactions
ADD COLUMN IF NOT EXISTS ai_converted_description TEXT;

-- 3. is_approved 컬럼 추가 (교사 승인 여부)
ALTER TABLE point_transactions
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;

-- 4. approved_at 컬럼 추가 (승인 시각)
ALTER TABLE point_transactions
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- =====================================================
-- 컬럼 설명
-- =====================================================
-- help_description: 학생이 "고마워" 모달에서 입력한 도와준 내용 (예: "25+8 계산이 어려웠는데...")
-- ai_converted_description: Gemini API로 변환된 생기부 형식 내용 (예: "두자릿수 더하기 한자릿수 계산을...")
-- is_approved: 교사가 승인 버튼을 눌렀는지 여부 (기본값: false)
-- approved_at: 교사가 승인한 시각 (승인 시에만 값 저장)
-- =====================================================

-- 검증 쿼리 (컬럼 추가 확인)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'point_transactions'
ORDER BY ordinal_position;
