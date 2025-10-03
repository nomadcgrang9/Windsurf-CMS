/**
 * 시간 처리 유틸리티
 * - 한국시간(KST) 처리
 * - 세션 만료 체크
 * - 자정 초기화 로직
 */

/**
 * 현재 한국시간(KST) 반환
 * @returns {Date} 한국시간 Date 객체
 */
export const getKoreanTime = () => {
  const now = new Date()
  // UTC 시간에 9시간 추가 (KST = UTC+9)
  const koreanTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  return koreanTime
}

/**
 * 한국시간 기준 오늘 날짜 문자열 반환
 * @returns {string} YYYY-MM-DD 형식
 */
export const getTodayKST = () => {
  const kst = getKoreanTime()
  const year = kst.getUTCFullYear()
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kst.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 세션 만료 시간 계산 (현재 시간 + 40분)
 * @returns {Date} 만료 시간
 */
export const getSessionExpiryTime = () => {
  const now = new Date()
  return new Date(now.getTime() + (40 * 60 * 1000))
}

/**
 * 세션이 만료되었는지 확인
 * @param {string|Date} expiresAt - 만료 시간
 * @returns {boolean} 만료되었으면 true
 */
export const isSessionExpired = (expiresAt) => {
  if (!expiresAt) return true
  
  const expiryTime = new Date(expiresAt)
  const now = new Date()
  
  return now >= expiryTime
}

/**
 * 세션 남은 시간 계산 (분 단위)
 * @param {string|Date} expiresAt - 만료 시간
 * @returns {number} 남은 시간 (분), 만료되었으면 0
 */
export const getSessionRemainingMinutes = (expiresAt) => {
  if (!expiresAt) return 0
  
  const expiryTime = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiryTime - now
  
  if (diffMs <= 0) return 0
  
  return Math.ceil(diffMs / (60 * 1000))
}

/**
 * 한국시간 기준 자정까지 남은 시간 계산 (밀리초)
 * @returns {number} 자정까지 남은 시간 (밀리초)
 */
export const getTimeUntilMidnightKST = () => {
  const kst = getKoreanTime()
  const midnight = new Date(kst)
  midnight.setUTCHours(15, 0, 0, 0) // 다음날 00:00 KST = 15:00 UTC
  
  // 이미 자정이 지났으면 다음날 자정으로
  if (midnight <= kst) {
    midnight.setUTCDate(midnight.getUTCDate() + 1)
  }
  
  return midnight - kst
}

/**
 * 날짜가 오늘(KST 기준)인지 확인
 * @param {string|Date} date - 확인할 날짜
 * @returns {boolean} 오늘이면 true
 */
export const isToday = (date) => {
  if (!date) return false
  
  const targetDate = new Date(date)
  const todayKST = getTodayKST()
  
  const year = targetDate.getUTCFullYear()
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(targetDate.getUTCDate()).padStart(2, '0')
  const targetDateStr = `${year}-${month}-${day}`
  
  return targetDateStr === todayKST
}

/**
 * 시간을 "HH:MM:SS" 형식으로 포맷
 * @param {Date} date - Date 객체
 * @returns {string} 포맷된 시간 문자열
 */
export const formatTime = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${hours}:${minutes}:${seconds}`
}

/**
 * 날짜를 "YYYY-MM-DD HH:MM:SS" 형식으로 포맷
 * @param {Date} date - Date 객체
 * @returns {string} 포맷된 날짜시간 문자열
 */
export const formatDateTime = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
