-- 학습안내 테스트 데이터 생성
-- Supabase SQL Editor에서 실행하세요

-- 기존 데이터 삭제 (테스트용)
DELETE FROM learning_guide;

-- 3학년 1반 학습안내
INSERT INTO learning_guide (class_info, content) 
VALUES (
  '3-1', 
  '안녕하세요! 오늘의 학습안내입니다.

1. 수학: 3단원 문제풀이 (교과서 45-50쪽)
2. 국어: 독서록 작성하기
3. 과학: 실험 보고서 제출

참고 자료: https://example.com/math-guide
질문 있으면 언제든지 물어보세요!'
);

-- 3학년 2반 학습안내
INSERT INTO learning_guide (class_info, content) 
VALUES (
  '3-2', 
  '오늘은 체험학습 날입니다!
준비물: 필기도구, 물병, 간식
집합 시간: 오전 9시
집합 장소: 학교 정문'
);

-- 4학년 1반 학습안내
INSERT INTO learning_guide (class_info, content) 
VALUES (
  '4-1', 
  '이번 주 학습 계획:
- 월: 영어 단어 시험
- 화: 수학 단원평가
- 수: 체육대회 연습
- 목: 미술 작품 제출
- 금: 주간 평가

화이팅!'
);

-- 6학년 1반 학습안내 (링크 포함)
INSERT INTO learning_guide (class_info, content) 
VALUES (
  '6-1', 
  '졸업 준비 안내

1. 졸업앨범 사진 촬영: 이번 주 금요일
2. 졸업 작품 제출: https://classroom.google.com
3. 진로 상담 신청: https://forms.gle/example

궁금한 점은 담임 선생님께 문의하세요.'
);

-- 확인 쿼리
SELECT * FROM learning_guide ORDER BY class_info;
