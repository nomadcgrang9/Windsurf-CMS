import { supabase } from './supabaseClient'
import { incrementPoints } from './pointService'

/**
 * 도움 시스템 서비스
 * - help_requests 테이블 CRUD
 * - 도움 요청/응답/완료 처리
 */

/**
 * 내 활성화된 도움 요청 조회
 * @param {string} studentId - 학번
 * @returns {Promise<Object|null>} 활성 요청 또는 null
 */
export const getMyActiveRequest = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // 데이터 없음
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ 활성 요청 조회 실패:', error.message)
    throw error
  }
}

/**
 * 도움 요청 생성 (도와줄래? / 도와줄게!)
 * @param {string} studentId - 학번
 * @param {string} status - 'requesting' or 'helping'
 * @returns {Promise<Object>} 생성된 요청
 */
export const createHelpRequest = async (studentId, status) => {
  try {
    // 기존 모든 요청 비활성화 (중복 키 방지)
    await supabase
      .from('help_requests')
      .update({ is_active: false })
      .eq('student_id', studentId)
      .eq('is_active', true)

    // UPSERT 방식으로 요청 생성/업데이트
    const { data, error } = await supabase
      .from('help_requests')
      .upsert(
        {
          student_id: studentId,
          status: status,
          is_active: true,
          started_at: new Date().toISOString()
        },
        {
          onConflict: 'student_id'
        }
      )
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ 도움 요청 생성 실패:', error.message)
    throw error
  }
}

/**
 * 도움 요청 취소 (- 버튼)
 * @param {string} studentId - 학번
 * @returns {Promise<Object>} 업데이트된 요청
 */
export const cancelHelpRequest = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('help_requests')
      .update({ is_active: false })
      .eq('student_id', studentId)
      .eq('is_active', true)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ 도움 요청 취소 실패:', error.message)
    throw error
  }
}

/**
 * 도움 완료 (고마워)
 * @param {string} requestingStudentId - 도움 받은 학생 ID
 * @param {string} helpingStudentId - 도와준 학생 ID
 * @returns {Promise<Object>} 결과
 */
export const completeHelp = async (requestingStudentId, helpingStudentId) => {
  try {
    // 1. 포인트 거래 기록
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert([
        {
          helper_student_id: helpingStudentId,
          helped_student_id: requestingStudentId,
          points: 1
          // help_type 제거 (CHECK 제약 조건 문제)
        }
      ])

    if (transactionError) throw transactionError

    // 2. 도와준 학생 포인트 +1
    await incrementPoints(helpingStudentId, 1)

    // 3. 도움 받은 학생의 요청 종료
    const { error: updateError } = await supabase
      .from('help_requests')
      .update({ is_active: false })
      .eq('student_id', requestingStudentId)
      .eq('is_active', true)

    if (updateError) throw updateError

    return { success: true }
  } catch (error) {
    console.error('❌ 도움 완료 처리 실패:', error.message)
    throw error
  }
}

/**
 * 학급별 활성 도움 요청 조회 (도움알림판용)
 * @param {string} classInfo - 학급 정보 (예: "3-1")
 * @returns {Promise<Array>} 학생 목록 + 도움 상태
 */
export const getActiveHelpRequests = async (classInfo) => {
  try {
    const [grade, classNumber] = classInfo.split('-').map(Number)

    // students와 help_requests LEFT JOIN
    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        name,
        student_number,
        help_requests!left (
          status,
          is_active
        )
      `)
      .eq('grade', grade)
      .eq('class_number', classNumber)
      .order('student_number', { ascending: true })

    if (error) throw error

    // 데이터 가공 (안전한 처리)
    return data.map(student => {
      let activeRequest = null
      
      // help_requests 안전하게 처리
      if (student.help_requests) {
        if (Array.isArray(student.help_requests)) {
          // 배열인 경우
          activeRequest = student.help_requests.find(req => req && req.is_active)
        } else if (typeof student.help_requests === 'object') {
          // 객체인 경우
          if (student.help_requests.is_active) {
            activeRequest = student.help_requests
          }
        }
      }
      
      return {
        student_id: student.student_id,
        name: student.name,
        status: activeRequest?.status || null,
        is_active: activeRequest?.is_active || false
      }
    })
  } catch (error) {
    console.error('❌ 도움 요청 목록 조회 실패:', error.message)
    throw error
  }
}

/**
 * 현재 도와주는 중인 학생 목록 조회 (고마워 모달용)
 * @param {string} classInfo - 학급 정보
 * @returns {Promise<Array>} 도와주는 중인 학생 목록
 */
export const getHelpingStudents = async (classInfo) => {
  try {
    const [grade, classNumber] = classInfo.split('-').map(Number)

    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        name,
        help_requests!inner (
          status,
          is_active
        )
      `)
      .eq('grade', grade)
      .eq('class_number', classNumber)
      .eq('help_requests.status', 'helping')
      .eq('help_requests.is_active', true)
      .order('student_number', { ascending: true })

    if (error) throw error

    return data.map(student => ({
      student_id: student.student_id,
      name: student.name
    }))
  } catch (error) {
    console.error('❌ 도와주는 학생 목록 조회 실패:', error.message)
    throw error
  }
}
