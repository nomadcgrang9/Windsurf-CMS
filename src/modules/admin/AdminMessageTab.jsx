import { useState, useEffect } from 'react'
import { sendMessageToStudent, getTeacherReplies, deleteMessage, subscribeToTeacherReplies } from '../../services/messageService.js'
import { getStudentsByClass } from '../../services/studentService.js'

/**
 * 관리자 쪽지 관리 탭
 * - 쪽지 보내기 (학년/반/학생 선택)
 * - 받은 답장 목록 (Realtime 구독)
 */
function AdminMessageTab() {
  // 쪽지 보내기 상태
  const [selectedGrade, setSelectedGrade] = useState('3')
  const [selectedClass, setSelectedClass] = useState('1')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [sending, setSending] = useState(false)

  // 받은 답장 상태
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(false)

  // 학년별 반 개수
  const classCount = {
    '3': 3,
    '4': 3,
    '6': 7
  }

  // 학급별 학생 조회
  const fetchStudents = async () => {
    try {
      const data = await getStudentsByClass(parseInt(selectedGrade), parseInt(selectedClass))
      setStudents(data)
      setSelectedStudent(data.length > 0 ? data[0].student_id : '')
    } catch (error) {
      console.error('학생 조회 실패:', error)
      setStudents([])
    }
  }

  // 받은 답장 조회
  const fetchReplies = async () => {
    setLoading(true)
    try {
      const data = await getTeacherReplies()
      setReplies(data)
    } catch (error) {
      console.error('답장 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 초기 로딩 및 Realtime 구독
  useEffect(() => {
    fetchStudents()
  }, [selectedGrade, selectedClass])

  useEffect(() => {
    fetchReplies()

    const channel = subscribeToTeacherReplies((newReply) => {
      setReplies(prev => [newReply, ...prev])
    })

    return () => {
      channel.unsubscribe()
    }
  }, [])

  // 쪽지 보내기
  const handleSendMessage = async () => {
    if (!selectedStudent) {
      alert('학생을 선택해주세요.')
      return
    }

    if (!messageContent.trim()) {
      alert('메시지 내용을 입력해주세요.')
      return
    }

    setSending(true)
    try {
      await sendMessageToStudent(selectedStudent, messageContent)
      alert('쪽지가 전송되었습니다.')
      setMessageContent('')
    } catch (error) {
      console.error('쪽지 전송 실패:', error)
      alert('쪽지 전송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  // 답장 클릭 (삭제)
  const handleReplyClick = async (messageId) => {
    try {
      await deleteMessage(messageId)
      setReplies(prev => prev.filter(reply => reply.message_id !== messageId))
    } catch (error) {
      console.error('답장 삭제 실패:', error)
      alert('답장 삭제에 실패했습니다.')
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* 쪽지 보내기 섹션 */}
      <div style={{
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700 }}>
          📨 쪽지 보내기
        </h3>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          {/* 학년 선택 */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
              학년
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="3">3학년</option>
              <option value="4">4학년</option>
              <option value="6">6학년</option>
            </select>
          </div>

          {/* 반 선택 */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
              반
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {Array.from({ length: classCount[selectedGrade] }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num}반</option>
              ))}
            </select>
          </div>

          {/* 학생 선택 */}
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
              학생
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              {students.map(student => (
                <option key={student.student_id} value={student.student_id}>
                  {student.student_id} {student.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 메시지 입력 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600 }}>
            메시지
          </label>
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value.slice(0, 200))}
            placeholder="학생에게 보낼 메시지를 입력하세요"
            maxLength={200}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #E0E0E0',
              borderRadius: '8px',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'Pretendard, -apple-system, sans-serif'
            }}
          />
        </div>

        {/* 보내기 버튼 */}
        <button
          onClick={handleSendMessage}
          disabled={sending}
          style={{
            padding: '12px 24px',
            background: sending ? '#D0D0D0' : '#B8D4D9',
            color: sending ? '#999' : 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: sending ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {sending ? '전송 중...' : '보내기'}
        </button>
      </div>

      {/* 받은 답장 섹션 */}
      <div style={{
        background: 'white',
        border: '1px solid #E0E0E0',
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
            📬 받은 답장
          </h3>
          <span style={{ fontSize: '12px', color: '#999' }}>
            클릭하면 삭제됩니다
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            로딩 중...
          </div>
        ) : replies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            받은 답장이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {replies.map(reply => (
              <div
                key={reply.message_id}
                onClick={() => handleReplyClick(reply.message_id)}
                style={{
                  padding: '12px 16px',
                  background: reply.is_read ? 'white' : '#FFE5E5',
                  border: '1px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
              >
                <span style={{ fontWeight: 600, marginRight: '8px' }}>
                  {reply.from_id} {reply.students?.name}:
                </span>
                <span style={{ color: '#555' }}>
                  "{reply.content}"
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminMessageTab
