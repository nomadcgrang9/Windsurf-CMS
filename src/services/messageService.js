import { supabase } from './supabaseClient.js'

/**
 * 쪽지 보내기 (관리자 → 학생)
 * @param {string} toStudentId - 받는 학생 ID (예: 3101)
 * @param {string} content - 메시지 내용
 * @returns {Promise<Object>} 생성된 메시지 객체
 */
export async function sendMessageToStudent(toStudentId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      from_type: 'teacher',
      from_id: null,
      to_type: 'student',
      to_id: toStudentId,
      content: content.trim(),
      is_read: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 답장 보내기 (학생 → 관리자)
 * @param {string} fromStudentId - 보내는 학생 ID
 * @param {string} content - 답장 내용 (최대 100자)
 * @returns {Promise<Object>} 생성된 메시지 객체
 */
export async function sendReplyToTeacher(fromStudentId, content) {
  const trimmedContent = content.trim().slice(0, 100) // 100자 제한

  const { data, error } = await supabase
    .from('messages')
    .insert({
      from_type: 'student',
      from_id: fromStudentId,
      to_type: 'teacher',
      to_id: 'admin',
      content: trimmedContent,
      is_read: false
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * 최근 안읽은 쪽지 1개 조회 (학생용)
 * @param {string} studentId - 학생 ID
 * @returns {Promise<Object|null>} 최근 안읽은 쪽지 또는 null
 */
export async function getLatestUnreadMessage(studentId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('to_type', 'student')
    .eq('to_id', studentId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * 쪽지 읽음 처리
 * @param {string} messageId - 메시지 UUID
 * @returns {Promise<void>}
 */
export async function markAsRead(messageId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('message_id', messageId)

  if (error) throw error
}

/**
 * 쪽지 삭제 (관리자용 - 답장 확인 후 삭제)
 * @param {string} messageId - 메시지 UUID
 * @returns {Promise<void>}
 */
export async function deleteMessage(messageId) {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('message_id', messageId)

  if (error) throw error
}

/**
 * 받은 답장 조회 (관리자용, 최근 20개)
 * @returns {Promise<Array>} 답장 목록 (학생 정보 포함)
 */
export async function getTeacherReplies() {
  // 1단계: 답장 메시지 조회
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('message_id, from_id, content, is_read, created_at')
    .eq('to_type', 'teacher')
    .eq('to_id', 'admin')
    .order('created_at', { ascending: false })
    .limit(20)

  if (msgError) throw msgError
  if (!messages || messages.length === 0) return []

  // 2단계: 학생 정보 조회 (from_id로)
  const studentIds = [...new Set(messages.map(m => m.from_id))]
  const { data: students, error: stuError } = await supabase
    .from('students')
    .select('student_id, name, grade, class_number, student_number')
    .in('student_id', studentIds)

  if (stuError) throw stuError

  // 3단계: 메시지와 학생 정보 병합
  const studentMap = {}
  students?.forEach(s => {
    studentMap[s.student_id] = s
  })

  return messages.map(msg => ({
    ...msg,
    students: studentMap[msg.from_id] || null
  }))
}

/**
 * Realtime 구독 (학생용 - 새 쪽지 수신)
 * @param {string} studentId - 학생 ID
 * @param {Function} callback - 새 쪽지 수신 시 호출될 콜백 함수
 * @returns {Object} Realtime 구독 객체 (cleanup용)
 */
export function subscribeToMyMessages(studentId, callback) {
  const channel = supabase
    .channel(`student_message_${studentId}`)  // 학생별 고유 채널
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
        // 필터 제거 - 모든 INSERT 이벤트 수신 후 콜백에서 필터링
      },
      (payload) => {
        console.log('🔔 [Realtime 이벤트 발생]', payload.new)
        // 콜백에서 필터링
        if (payload.new.to_type === 'student' && payload.new.to_id === studentId) {
          console.log('✅ [내 쪽지 맞음]', payload.new)
          callback(payload.new)
        } else {
          console.log('❌ [내 쪽지 아님]', { to_type: payload.new.to_type, to_id: payload.new.to_id, expected: studentId })
        }
      }
    )
    .subscribe((status) => {
      console.log(`🔌 [Realtime 구독 상태 - ${studentId}]`, status)
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime 구독 성공')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime 구독 실패')
      }
    })

  return channel
}

/**
 * Realtime 구독 (관리자용 - 새 답장 수신)
 * @param {Function} callback - 새 답장 수신 시 호출될 콜백 함수
 * @returns {Object} Realtime 구독 객체 (cleanup용)
 */
export function subscribeToTeacherReplies(callback) {
  const channel = supabase
    .channel('teacher_reply_notification')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: 'to_type=eq.teacher'
      },
      async (payload) => {
        // 학생 정보 조회
        const { data: student } = await supabase
          .from('students')
          .select('student_id, name, grade, class_number, student_number')
          .eq('student_id', payload.new.from_id)
          .single()

        callback({
          ...payload.new,
          students: student
        })
      }
    )
    .subscribe()

  return channel
}
