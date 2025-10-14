import { supabase } from './supabaseClient'

/**
 * 학급별 학생 조회
 * @param {number} grade - 학년 (3, 4, 6)
 * @param {number} classNumber - 반 번호 (1, 2, 3...)
 * @returns {Promise<Array>} 학생 목록
 */
export async function getStudentsByClass(grade, classNumber) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('grade', grade)
    .eq('class_number', classNumber)
    .order('student_number')

  if (error) {
    console.error('학급별 학생 조회 오류:', error)
    throw new Error('학생 목록을 불러올 수 없습니다.')
  }

  return data || []
}

/**
 * 학생 생성 또는 업데이트 (CSV 업로드용)
 * @param {Object} student - 학생 정보
 * @param {string} student.student_id - 학번 (4자리)
 * @param {string} student.name - 이름
 * @param {number} student.grade - 학년
 * @param {number} student.class_number - 반 번호
 * @param {number} student.student_number - 번호
 * @returns {Promise<Object>} 생성/업데이트된 학생 정보
 */
export async function createOrUpdateStudent(student) {
  const { data, error } = await supabase
    .from('students')
    .upsert({
      student_id: student.student_id,
      name: student.name,
      grade: student.grade,
      class_number: student.class_number,
      student_number: student.student_number
    }, {
      onConflict: 'student_id'
    })
    .select()
    .single()

  if (error) {
    console.error('학생 생성/업데이트 오류:', error)
    throw new Error(`학생 ${student.student_id} 저장 실패`)
  }

  return data
}

/**
 * 전체 학생 조회 (로그인 상태 포함)
 * @returns {Promise<Array>} 학생 목록 (로그인 세션 정보 포함)
 */
export async function getAllStudentsWithLoginStatus() {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      login_sessions (
        session_id,
        login_time,
        expires_at
      )
    `)
    .order('student_id')

  if (error) {
    console.error('전체 학생 조회 오류:', error)
    throw new Error('학생 목록을 불러올 수 없습니다.')
  }

  // 로그인 상태 판별 (세션이 있고 만료되지 않았으면 로그인 중)
  const studentsWithStatus = data.map(student => {
    const session = student.login_sessions?.[0]
    const isLoggedIn = session && new Date(session.expires_at) > new Date()
    
    return {
      ...student,
      is_logged_in: isLoggedIn,
      login_time: session?.login_time || null
    }
  })

  return studentsWithStatus
}

/**
 * 학급 정보로 학생 조회 (친구 투표용)
 * @param {string} classInfo - 학급 정보 (예: "4-1")
 * @returns {Promise<Array>} 학생 목록
 */
export async function getClassStudents(classInfo) {
  const [grade, classNumber] = classInfo.split('-').map(Number)
  
  const { data, error } = await supabase
    .from('students')
    .select('student_id, name, grade, class_number, student_number')
    .eq('grade', grade)
    .eq('class_number', classNumber)
    .order('student_number')

  if (error) {
    console.error('학급 학생 조회 오류:', error)
    throw new Error('학생 목록을 불러올 수 없습니다.')
  }

  return data || []
}
