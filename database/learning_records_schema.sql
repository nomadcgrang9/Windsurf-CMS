-- =====================================================
-- 배움기록 (Learning Records) 테이블 생성
-- =====================================================
-- 작성일: 2025-10-05
-- 목적: 학생의 일일 배움기록을 저장하고 AI로 생기부 형식으로 변환
-- =====================================================

-- 1. learning_records 테이블 생성
CREATE TABLE IF NOT EXISTS learning_records (
  -- 기본 키
  record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 학생 정보
  student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  
  -- 기록 날짜
  record_date DATE NOT NULL,
  
  -- ===== 학생 입력 데이터 =====
  -- 1. 오늘의 핵심배움 (섹션 1)
  core_learning TEXT,
  
  -- 2. 학습과정 돌아보기 (섹션 2) - JSON 배열로 저장
  -- 예: ["친구가 어려워하는 것을 도와줬어요.", "선생님께 용기 내어 질문했어요."]
  learning_process JSONB DEFAULT '[]'::jsonb,
  
  -- 3. 나의 생각과 질문 (섹션 3)
  thoughts_and_questions TEXT,
  
  -- ===== AI 변환 결과 =====
  -- AI가 생성한 생활기록부 형식 내용
  ai_converted_record TEXT,
  
  -- ===== 승인 관리 =====
  -- 교사 승인 여부
  is_approved BOOLEAN DEFAULT false,
  
  -- 승인 시각
  approved_at TIMESTAMPTZ,
  
  -- ===== 메타데이터 =====
  -- 제출 여부 (임시저장 vs 제출)
  is_submitted BOOLEAN DEFAULT false,
  
  -- 생성 시각
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 제출 시각
  submitted_at TIMESTAMPTZ,
  
  -- 수정 시각
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ===== 제약 조건 =====
  -- 학생당 하루 1개 기록만 허용
  CONSTRAINT unique_student_date UNIQUE(student_id, record_date)
);

-- 2. 인덱스 생성 (조회 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_learning_records_student 
  ON learning_records(student_id);

CREATE INDEX IF NOT EXISTS idx_learning_records_date 
  ON learning_records(record_date);

CREATE INDEX IF NOT EXISTS idx_learning_records_submitted 
  ON learning_records(is_submitted);

CREATE INDEX IF NOT EXISTS idx_learning_records_approved 
  ON learning_records(is_approved);

-- 3. 자동 업데이트 트리거 (updated_at)
CREATE OR REPLACE FUNCTION update_learning_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_learning_records_updated_at
  BEFORE UPDATE ON learning_records
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_records_updated_at();

-- =====================================================
-- 컬럼 설명
-- =====================================================
-- record_id: 기록 고유 ID (UUID)
-- student_id: 학생 ID (외래키)
-- record_date: 기록 작성 날짜
-- core_learning: 오늘의 핵심배움 (필수 또는 learning_process 중 택1)
-- learning_process: 학습과정 체크리스트 (JSON 배열)
-- thoughts_and_questions: 나의 생각과 질문 (선택)
-- ai_converted_record: AI가 생성한 생기부 내용
-- is_approved: 교사 승인 여부
-- approved_at: 승인 시각
-- is_submitted: 제출 여부 (false: 임시저장, true: 제출)
-- created_at: 최초 생성 시각
-- submitted_at: 제출 시각
-- updated_at: 마지막 수정 시각
-- =====================================================

-- 4. 테이블 생성 확인 쿼리
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_name = 'learning_records'
ORDER BY ordinal_position;

-- 5. 샘플 데이터 삽입 (테스트용)
-- 실제 사용 시 주석 해제
/*
INSERT INTO learning_records (
  student_id,
  record_date,
  core_learning,
  learning_process,
  thoughts_and_questions,
  is_submitted,
  submitted_at
) VALUES (
  '3101', -- 실제 student_id로 변경 (예: '3101')
  CURRENT_DATE,
  '분수의 덧셈에서 분모를 같게 만드는 방법을 배웠습니다.',
  '["포기하지 않고 끝까지 해결했어요.", "친구들과 협력해서 문제를 해결했어요."]'::jsonb,
  '분모가 다른 분수를 더할 때 왜 통분을 해야 하는지 이제 이해했어요!',
  true,
  NOW()
);
*/
