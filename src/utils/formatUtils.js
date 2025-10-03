/**
 * 데이터 포맷팅 유틸리티
 * - 학번, 학급 정보 파싱 및 변환
 */

/**
 * 학번을 학년/반/번호로 파싱
 * @param {string} studentId - 4자리 학번 (예: "3121")
 * @returns {{grade: number, classNumber: number, studentNumber: number}} 파싱된 정보
 * 
 * 예시: "3121" → {grade: 3, classNumber: 1, studentNumber: 21}
 */
export const parseStudentId = (studentId) => {
  if (!studentId || studentId.length !== 4) {
    throw new Error('학번은 4자리여야 합니다.')
  }
  
  return {
    grade: parseInt(studentId[0]),
    classNumber: parseInt(studentId[1]),
    studentNumber: parseInt(studentId.slice(2))
  }
}

/**
 * 학급 텍스트를 학년/반으로 파싱
 * @param {string} classText - 학급 텍스트 (예: "3-1")
 * @returns {{grade: number, classNumber: number}} 파싱된 정보
 * 
 * 예시: "3-1" → {grade: 3, classNumber: 1}
 */
export const parseClassText = (classText) => {
  const match = classText.match(/^(\d)-(\d)$/)
  if (!match) {
    throw new Error('학급 형식이 올바르지 않습니다. (예: 3-1)')
  }
  
  return {
    grade: parseInt(match[1]),
    classNumber: parseInt(match[2])
  }
}

/**
 * 학년/반을 텍스트로 변환
 * @param {number} grade - 학년
 * @param {number} classNumber - 반
 * @returns {string} 학급 텍스트 (예: "3학년 1반")
 */
export const formatClassInfo = (grade, classNumber) => {
  return `${grade}학년 ${classNumber}반`
}

/**
 * 학번을 표시용 텍스트로 변환
 * @param {string} studentId - 4자리 학번
 * @returns {string} 표시용 텍스트 (예: "3학년 1반 21번")
 */
export const formatStudentId = (studentId) => {
  const { grade, classNumber, studentNumber } = parseStudentId(studentId)
  return `${grade}학년 ${classNumber}반 ${studentNumber}번`
}

/**
 * URL에서 https 링크 추출
 * @param {string} text - 텍스트
 * @returns {Array<string>} 추출된 링크 배열
 */
export const extractLinks = (text) => {
  if (!text) return []
  
  const urlRegex = /https?:\/\/[^\s]+/g
  return text.match(urlRegex) || []
}

/**
 * 텍스트에서 링크를 클릭 가능한 a 태그로 변환
 * @param {string} text - 원본 텍스트
 * @returns {string} HTML 문자열
 */
export const linkifyText = (text) => {
  if (!text) return ''
  
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
}

/**
 * 포인트를 표시용 문자열로 변환
 * @param {number} current - 현재 포인트
 * @param {number} max - 최대 포인트
 * @returns {string} 표시용 문자열 (예: "15/20")
 */
export const formatPoints = (current, max = 20) => {
  return `${current}/${max}`
}

/**
 * 포인트 퍼센트 계산
 * @param {number} current - 현재 포인트
 * @param {number} max - 최대 포인트
 * @returns {number} 퍼센트 (0-100)
 */
export const calculatePointsPercent = (current, max = 20) => {
  if (max === 0) return 0
  return Math.min(Math.round((current / max) * 100), 100)
}
