import { supabase } from './supabaseClient'

/**
 * 배움기록 관리 API 서비스
 */

/**
 * 학급별 최신 배움기록 조회
 * @param {string} classInfo - 학급 정보 (예: "3-1")
 * @returns {Promise<Array>} 학생별 최신 기록 배열
 */
export async function getLatestRecords(classInfo) {
  try {
    // classInfo 파싱 (예: "3-1" -> grade: 3, class_number: 1)
    const [grade, classNumber] = classInfo.split('-').map(Number)

    // 1. 해당 학급의 학생 ID 목록 조회
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('student_id, name')
      .eq('grade', grade)
      .eq('class_number', classNumber)
      .order('student_id')

    if (studentError) throw studentError

    if (!students || students.length === 0) {
      return []
    }

    const studentIds = students.map(s => s.student_id)

    // 2. 각 학생의 최신 기록 조회
    const { data: records, error: recordError } = await supabase
      .from('learning_records')
      .select('*')
      .in('student_id', studentIds)
      .order('student_id')
      .order('record_date', { ascending: false })

    if (recordError) throw recordError

    // 3. 학생별로 최신 기록만 필터링
    const latestRecords = []
    const seenStudents = new Set()

    for (const record of records || []) {
      if (!seenStudents.has(record.student_id)) {
        const student = students.find(s => s.student_id === record.student_id)
        latestRecords.push({
          ...record,
          student_name: student?.name || '알 수 없음'
        })
        seenStudents.add(record.student_id)
      }
    }

    return latestRecords

  } catch (error) {
    console.error('최신 기록 조회 오류:', error)
    throw error
  }
}

/**
 * 특정 학생의 모든 배움기록 조회
 * @param {string} studentId - 학생 ID
 * @returns {Promise<Array>} 학생의 모든 기록 배열 (날짜 내림차순)
 */
export async function getStudentRecords(studentId) {
  try {
    const { data, error } = await supabase
      .from('learning_records')
      .select('*')
      .eq('student_id', studentId)
      .order('record_date', { ascending: false })

    if (error) throw error
    return data || []

  } catch (error) {
    console.error('학생 기록 조회 오류:', error)
    throw error
  }
}

/**
 * AI 변환 내용 저장
 * @param {string} recordId - 기록 ID
 * @param {string} aiContent - AI 변환된 내용
 * @returns {Promise<Object>} 업데이트된 기록
 */
export async function saveAIConversion(recordId, aiContent) {
  try {
    const { data, error } = await supabase
      .from('learning_records')
      .update({ ai_converted_record: aiContent })
      .eq('record_id', recordId)
      .select()
      .single()

    if (error) throw error
    return data

  } catch (error) {
    console.error('AI 변환 저장 오류:', error)
    throw error
  }
}

/**
 * 배움기록 승인
 * @param {string} recordId - 기록 ID
 * @returns {Promise<Object>} 업데이트된 기록
 */
export async function approveRecord(recordId) {
  try {
    const { data, error } = await supabase
      .from('learning_records')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString()
      })
      .eq('record_id', recordId)
      .select()
      .single()

    if (error) throw error
    return data

  } catch (error) {
    console.error('승인 처리 오류:', error)
    throw error
  }
}

/**
 * 배움기록 삭제
 * @param {string} recordId - 기록 ID
 * @returns {Promise<void>}
 */
export async function deleteRecord(recordId) {
  try {
    const { error } = await supabase
      .from('learning_records')
      .delete()
      .eq('record_id', recordId)

    if (error) throw error

  } catch (error) {
    console.error('삭제 처리 오류:', error)
    throw error
  }
}

/**
 * Excel 다운로드용 데이터 조회
 * @param {string} classInfo - 학급 정보
 * @returns {Promise<Array>} AI 변환된 기록 배열
 */
export async function getExportData(classInfo) {
  try {
    // classInfo 파싱 (예: "3-1" -> grade: 3, class_number: 1)
    const [grade, classNumber] = classInfo.split('-').map(Number)

    // 1. 해당 학급의 학생 ID 목록 조회
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('student_id, name')
      .eq('grade', grade)
      .eq('class_number', classNumber)

    if (studentError) throw studentError

    if (!students || students.length === 0) {
      return []
    }

    const studentIds = students.map(s => s.student_id)

    // 2. AI 변환된 기록만 조회
    const { data: records, error: recordError } = await supabase
      .from('learning_records')
      .select('student_id, ai_converted_record')
      .in('student_id', studentIds)
      .not('ai_converted_record', 'is', null)
      .order('student_id')

    if (recordError) throw recordError

    // 3. 학생 이름 매핑
    return (records || []).map((record, index) => {
      const student = students.find(s => s.student_id === record.student_id)
      return {
        번호: index + 1,
        학생명: student?.name || '알 수 없음',
        'AI 변환 내용': record.ai_converted_record
      }
    })

  } catch (error) {
    console.error('Excel 데이터 조회 오류:', error)
    throw error
  }
}
