/**
 * 입력 검증 유틸리티
 * - 학번, 이름, 학급 정보 검증
 */

/**
 * 학번 형식 검증
 * @param {string} studentId - 4자리 학번 (예: "3121")
 * @returns {boolean} 유효하면 true
 * 
 * 형식: GCNN (G=학년, C=반, NN=번호)
 * - 학년: 3, 4, 6만 허용
 * - 반: 3학년(1-3), 4학년(1-3), 6학년(1-7)
 * - 번호: 01-99
 */
export const validateStudentId = (studentId) => {
  if (!studentId || typeof studentId !== 'string') return false
  
  // 4자리 숫자 확인
  if (!/^\d{4}$/.test(studentId)) return false
  
  const grade = parseInt(studentId[0])
  const classNum = parseInt(studentId[1])
  const studentNum = parseInt(studentId.slice(2))
  
  // 학년 검증 (3, 4, 6만 허용)
  if (![3, 4, 6].includes(grade)) return false
  
  // 반 검증
  if (grade === 3 || grade === 4) {
    if (classNum < 1 || classNum > 3) return false
  } else if (grade === 6) {
    if (classNum < 1 || classNum > 7) return false
  }
  
  // 번호 검증 (1-99)
  if (studentNum < 1 || studentNum > 99) return false
  
  return true
}

/**
 * 이름 검증
 * @param {string} name - 학생 이름
 * @returns {boolean} 유효하면 true
 * 
 * 규칙:
 * - 1-10자 이내
 * - 공백 제외 시 1자 이상
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') return false
  
  const trimmedName = name.trim()
  
  // 빈 문자열 체크
  if (trimmedName.length === 0) return false
  
  // 길이 체크 (1-10자)
  if (trimmedName.length > 10) return false
  
  return true
}

/**
 * 학급 텍스트 형식 검증
 * @param {string} classText - 학급 텍스트 (예: "3-1", "6-7")
 * @returns {boolean} 유효하면 true
 * 
 * 형식: "G-C" (G=학년, C=반)
 */
export const validateClassText = (classText) => {
  if (!classText || typeof classText !== 'string') return false
  
  // "숫자-숫자" 형식 확인
  const match = classText.match(/^(\d)-(\d)$/)
  if (!match) return false
  
  const grade = parseInt(match[1])
  const classNum = parseInt(match[2])
  
  // 학년 검증
  if (![3, 4, 6].includes(grade)) return false
  
  // 반 검증
  if (grade === 3 || grade === 4) {
    if (classNum < 1 || classNum > 3) return false
  } else if (grade === 6) {
    if (classNum < 1 || classNum > 7) return false
  }
  
  return true
}

/**
 * 관리자 비밀번호 검증
 * @param {string} password - 비밀번호
 * @returns {boolean} 유효하면 true
 */
export const validateAdminPassword = (password) => {
  return password === 'teacher123'
}
