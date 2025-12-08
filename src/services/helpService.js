import { supabase } from './supabaseClient'
import { incrementPoints } from './pointService'
import { getHelpSettingsByStudentId, DEFAULT_SETTINGS } from './helpSettingsService'

/**
 * 도움 시스템 서비스
 * - help_requests 테이블 CRUD
 * - 도움 요청/응답/완료 처리
 * - 쿨타임 및 일일 제한은 help_settings 테이블에서 조회
 */

/**
 * 내 활성화된 도움 요청 조회
 * @param {string} studentId - 학번
 * @returns {Promise<Object|null>} 활성 요청 또는 null
 *
 * 40분 자동 만료 처리 포함
 */
export const getMyActiveRequest = async (studentId) => {
  try {
    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('started_at', { ascending: false, nullsFirst: false })
      .limit(1)

    if (error) {
      console.error('❌ 활성 요청 조회 오류:', error)
      return null
    }

    const activeRequest = Array.isArray(data) && data.length > 0 ? data[0] : null

    if (activeRequest && activeRequest.started_at) {
      const startedAt = new Date(activeRequest.started_at)
      const now = new Date()
      const elapsedMs = now - startedAt
      const EXPIRY_MS = 40 * 60 * 1000 // 40분

      if (elapsedMs > EXPIRY_MS) {
        await supabase
          .from('help_requests')
          .update({ is_active: false })
          .eq('student_id', studentId)
          .eq('is_active', true)

        return null
      }
    }

    return activeRequest
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
 * @param {string} helpDescription - 도와준 내용 (학생이 작성)
 * @returns {Promise<Object>} 결과
 */
export const completeHelp = async (requestingStudentId, helpingStudentId, helpDescription = '') => {
  try {
    // 1. 포인트 거래 기록 (도와준 내용 포함)
    const { error: transactionError } = await supabase
      .from('point_transactions')
      .insert([
        {
          helper_student_id: helpingStudentId,
          helped_student_id: requestingStudentId,
          points: 1,
          help_description: helpDescription || null
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

    // 4. 도와준 학생의 "도와줄게!" 상태 비활성화 + 쿨타임 설정 (DB에서 조회)
    // 🎯 하드코딩 제거: help_settings 테이블에서 쿨타임 값 조회
    const settings = await getHelpSettingsByStudentId(helpingStudentId)
    const cooldownSeconds = settings?.cooldown_seconds ?? DEFAULT_SETTINGS.cooldown_seconds

    console.log('🎯 쿨타임 설정 조회:', {
      helpingStudentId,
      cooldownSeconds,
      timestamp: new Date().toISOString()
    })

    // 쿨타임 적용 (0초면 쿨타임 없음)
    let updateData = { is_active: false }

    if (cooldownSeconds > 0) {
      const cooldownUntil = new Date(Date.now() + cooldownSeconds * 1000)
      updateData.cooldown_until = cooldownUntil.toISOString()
      console.log('✅ 쿨타임 설정:', cooldownSeconds, '초 →', cooldownUntil.toISOString())
    } else {
      updateData.cooldown_until = null // 쿨타임 해제
      console.log('✅ 쿨타임 없음 (0초 설정)')
    }

    const { data: cooldownData, error: cooldownError } = await supabase
      .from('help_requests')
      .update(updateData)
      .eq('student_id', helpingStudentId)
      .eq('status', 'helping')
      .select()

    if (cooldownError) {
      console.error('❌ 쿨타임 설정 실패:', cooldownError)
    } else {
      console.log('✅ 쿨타임 적용 성공:', cooldownData)
    }

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
 * 
 * 40분 자동 만료 처리 포함
 */
export const getActiveHelpRequests = async (classInfo) => {
  try {
    const [grade, classNumber] = classInfo.split('-').map(Number)

    // students와 help_requests LEFT JOIN (started_at 포함)
    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        name,
        student_number,
        help_requests!left (
          status,
          is_active,
          started_at
        )
      `)
      .eq('grade', grade)
      .eq('class_number', classNumber)
      .order('student_number', { ascending: true })

    if (error) throw error

    const EXPIRY_MS = 40 * 60 * 1000 // 40분
    const now = new Date()
    const expiredStudentIds = []

    // 데이터 가공 + 만료 체크
    const result = data.map(student => {
      let activeRequest = null
      
      // help_requests 안전하게 처리
      if (student.help_requests) {
        if (Array.isArray(student.help_requests)) {
          activeRequest = student.help_requests.find(req => req && req.is_active)
        } else if (typeof student.help_requests === 'object') {
          if (student.help_requests.is_active) {
            activeRequest = student.help_requests
          }
        }
      }

      // 40분 만료 체크
      if (activeRequest && activeRequest.started_at) {
        const startedAt = new Date(activeRequest.started_at)
        const elapsedMs = now - startedAt

        if (elapsedMs > EXPIRY_MS) {
          console.log(`⏰ 도움 요청 만료: ${student.name} (${(elapsedMs / 60000).toFixed(1)}분 경과)`)
          expiredStudentIds.push(student.student_id)
          activeRequest = null // 만료된 요청은 null 처리
        }
      }
      
      return {
        student_id: student.student_id,
        name: student.name,
        status: activeRequest?.status || null,
        is_active: activeRequest ? true : false
      }
    })

    // 만료된 요청 일괄 비활성화
    if (expiredStudentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('help_requests')
        .update({ is_active: false })
        .in('student_id', expiredStudentIds)
        .eq('is_active', true)

      if (updateError) {
        console.error('❌ 만료된 요청 비활성화 실패:', updateError)
      }
    }

    return result
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

/**
 * 오늘 고마워 받은 횟수 조회 (포인트 받은 횟수)
 * @param {string} studentId - 학번
 * @returns {Promise<number>} 오늘 고마워 받은 횟수
 */
export const getTodayThanksCount = async (studentId) => {
  try {
    // 오늘 09:00 기준
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    
    // 현재 시간이 09:00 이전이면 어제 09:00 기준
    if (new Date().getHours() < 9) {
      today.setDate(today.getDate() - 1)
    }

    const { count, error } = await supabase
      .from('point_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('helper_student_id', studentId)
      .gte('transaction_time', today.toISOString())  // created_at → transaction_time

    if (error) throw error

    return count || 0
  } catch (error) {
    console.error('❌ 오늘 고마워 횟수 조회 실패:', error.message)
    return 0 // 에러 시 0 반환 (사용자 경험 우선)
  }
}

/**
 * "도와줄게!" 쿨타임 확인
 * @param {string} studentId - 학번
 * @returns {Promise<Object>} { isInCooldown: boolean, remainingSeconds: number }
 */
export const checkHelpCooldown = async (studentId) => {
  try {
    console.log('🔍 쿨타임 확인 시작:', studentId)

    // 🎯 수정: status 조건 제거, is_active와 무관하게 최신 레코드 조회
    const { data, error } = await supabase
      .from('help_requests')
      .select('cooldown_until, status, is_active, started_at')
      .eq('student_id', studentId)
      .limit(1)
      .maybeSingle()

    console.log('📊 쿨타임 조회 결과:', { data, error })

    if (error) {
      console.error('❌ 쿨타임 조회 오류:', error)
      return { isInCooldown: false, remainingSeconds: 0 }
    }

    if (!data || !data.cooldown_until) {
      console.log('⚠️ 쿨타임 데이터 없음')
      return { isInCooldown: false, remainingSeconds: 0 }
    }

    const cooldownUntil = new Date(data.cooldown_until)
    const now = new Date()
    const remainingMs = cooldownUntil - now

    console.log('⏰ 쿨타임 계산:', {
      cooldownUntil: cooldownUntil.toISOString(),
      now: now.toISOString(),
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000)
    })

    if (remainingMs <= 0) {
      // 쿨타임 만료
      console.log('✅ 쿨타임 만료')
      return { isInCooldown: false, remainingSeconds: 0 }
    }

    // 쿨타임 진행 중
    const remainingSeconds = Math.ceil(remainingMs / 1000)
    console.log('🚫 쿨타임 진행 중:', remainingSeconds, '초 남음')
    return { isInCooldown: true, remainingSeconds }
  } catch (error) {
    console.error('❌ 쿨타임 확인 실패:', error.message)
    return { isInCooldown: false, remainingSeconds: 0 }
  }
}
