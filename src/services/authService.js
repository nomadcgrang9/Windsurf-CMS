import { supabase } from './supabaseClient'
import { validateStudentId, validateName, validateAdminPassword } from '../utils/validationUtils'
import { parseStudentId } from '../utils/formatUtils'
import { getSessionExpiryTime, isSessionExpired } from '../utils/timeUtils'

/**
 * 인증 서비스
 * - 학생 로그인/로그아웃
 * - 관리자 로그인
 * - 세션 관리 (40분 만료)
 */

/**
 * 학생 로그인
 * @param {string} studentId - 4자리 학번
 * @param {string} name - 학생 이름
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 * 
 * 프로세스:
 * 1. 입력 검증
 * 2. Supabase에서 학생 정보 조회
 * 3. 세션 생성 (40분 만료)
 */
export const loginStudent = async (studentId, name) => {
  try {
    // 1. 입력 검증
    if (!validateStudentId(studentId)) {
      return { success: false, error: '올바른 학번 형식이 아닙니다. (4자리 숫자)' }
    }
    
    if (!validateName(name)) {
      return { success: false, error: '이름을 입력해주세요.' }
    }
    
    // 2. 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .eq('name', name.trim())
      .single()
    
    if (studentError || !student) {
      return { success: false, error: '학번 또는 이름이 일치하지 않습니다.' }
    }
    
    // 3. 기존 세션 삭제 (중복 로그인 방지)
    await supabase
      .from('login_sessions')
      .delete()
      .eq('student_id', studentId)
    
    // 4. 새 세션 생성
    const expiresAt = getSessionExpiryTime()
    const { data: session, error: sessionError } = await supabase
      .from('login_sessions')
      .insert({
        student_id: studentId,
        login_time: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()
    
    if (sessionError) {
      return { success: false, error: '세션 생성에 실패했습니다.' }
    }
    
    return {
      success: true,
      data: {
        student,
        session
      }
    }
  } catch (error) {
    console.error('로그인 오류:', error)
    return { success: false, error: '로그인 중 오류가 발생했습니다.' }
  }
}

/**
 * 세션 검증
 * @param {string} studentId - 학번
 * @returns {Promise<{valid: boolean, session?: object}>}
 * 
 * 40분 만료 체크
 */
export const validateSession = async (studentId) => {
  try {
    const { data: session, error } = await supabase
      .from('login_sessions')
      .select('*')
      .eq('student_id', studentId)
      .single()
    
    if (error || !session) {
      return { valid: false }
    }
    
    // 만료 체크
    if (isSessionExpired(session.expires_at)) {
      // 만료된 세션 삭제
      await supabase
        .from('login_sessions')
        .delete()
        .eq('student_id', studentId)
      
      return { valid: false }
    }
    
    return { valid: true, session }
  } catch (error) {
    console.error('세션 검증 오류:', error)
    return { valid: false }
  }
}

/**
 * 학생 로그아웃
 * @param {string} studentId - 학번
 * @returns {Promise<{success: boolean}>}
 */
export const logoutStudent = async (studentId) => {
  try {
    // 세션 삭제
    await supabase
      .from('login_sessions')
      .delete()
      .eq('student_id', studentId)
    
    // 도움 요청 상태 초기화
    await supabase
      .from('help_requests')
      .update({ is_active: false })
      .eq('student_id', studentId)
    
    return { success: true }
  } catch (error) {
    console.error('로그아웃 오류:', error)
    return { success: false }
  }
}

/**
 * 관리자 로그인
 * @param {string} password - 비밀번호
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const loginAdmin = async (password) => {
  try {
    if (!validateAdminPassword(password)) {
      return { success: false, error: '비밀번호가 일치하지 않습니다.' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('관리자 로그인 오류:', error)
    return { success: false, error: '로그인 중 오류가 발생했습니다.' }
  }
}

/**
 * 현재 로그인한 학생 정보 조회
 * @param {string} studentId - 학번
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export const getCurrentStudent = async (studentId) => {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single()
    
    if (error || !student) {
      return { success: false, error: '학생 정보를 찾을 수 없습니다.' }
    }
    
    return { success: true, data: student }
  } catch (error) {
    console.error('학생 정보 조회 오류:', error)
    return { success: false, error: '학생 정보 조회 중 오류가 발생했습니다.' }
  }
}
