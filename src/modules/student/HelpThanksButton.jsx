import { useState, useEffect } from 'react'
import { getMyActiveRequest, getHelpingStudents, completeHelp } from '../../services/helpService'
import { parseStudentId } from '../../utils/formatUtils'
import { getDailyPoints } from '../../services/pointService'
import { supabase } from '../../services/supabaseClient'

/**
 * 고마워(엄지척) 버튼
 * - Column 5 (21%, 하단 25%)
 * - 감사 표시 및 포인트 지급 버튼
 * - 도와준 학생 선택 모달
 */
function HelpThanksButton() {
  const [myStatus, setMyStatus] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [helpingStudents, setHelpingStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loading, setLoading] = useState(false)

  // 내 상태 확인
  const checkMyStatus = async () => {
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) return

      const request = await getMyActiveRequest(studentId)
      setMyStatus(request?.status || null)
    } catch (error) {
      console.error('상태 확인 오류:', error)
    }
  }

  useEffect(() => {
    checkMyStatus()

    // Realtime 구독으로 상태 동기화
    const studentId = localStorage.getItem('studentId')
    if (!studentId) return

    const channel = supabase
      .channel('help_status_sync_thanks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          checkMyStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 고마워 클릭
  const handleClick = async () => {
    const studentId = localStorage.getItem('studentId')
    if (!studentId) {
      alert('로그인 정보를 찾을 수 없습니다.')
      return
    }

    if (myStatus !== 'requesting') {
      alert('도움을 요청한 상태에서만 사용할 수 있습니다.')
      return
    }

    // 도와주는 중인 학생 목록 조회
    try {
      const { grade, classNumber } = parseStudentId(studentId)
      const classInfo = `${grade}-${classNumber}`
      const students = await getHelpingStudents(classInfo)
      
      if (students.length === 0) {
        alert('현재 도와주는 중인 학생이 없습니다.')
        return
      }

      setHelpingStudents(students)
      setShowModal(true)
    } catch (error) {
      console.error('도와주는 학생 조회 오류:', error)
      alert('학생 목록을 불러올 수 없습니다.')
    }
  }

  // 학생 선택 및 포인트 지급
  const handleConfirm = async () => {
    if (!selectedStudent) {
      alert('도와준 학생을 선택해주세요.')
      return
    }

    const studentId = localStorage.getItem('studentId')
    if (!studentId) return

    setLoading(true)
    try {
      // 도와준 학생의 포인트 확인
      const points = await getDailyPoints(selectedStudent)
      if (points.current_points >= 20) {
        alert('선택한 학생이 이미 포인트 한도에 도달했습니다.')
        setLoading(false)
        return
      }

      // 포인트 지급 및 요청 종료
      await completeHelp(studentId, selectedStudent)
      
      setShowModal(false)
      setMyStatus(null)
      setSelectedStudent(null)
      alert('포인트가 지급되었습니다!')
    } catch (error) {
      console.error('포인트 지급 오류:', error)
      alert('포인트 지급 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="help-thanks-button">
        <button
          className="help-system-button"
          onClick={handleClick}
          disabled={myStatus !== 'requesting'}
          style={{
            opacity: myStatus !== 'requesting' ? 0.5 : 1,
            cursor: myStatus !== 'requesting' ? 'not-allowed' : 'pointer'
          }}
        >
          <img src="/characters/thanks.png" alt="고마워" className="help-icon" />
          <div style={{ marginTop: '8px' }}>고마워</div>
        </button>
      </div>

      {/* 도와준 학생 선택 모달 */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              누가 도와줬나요?
            </h3>

            <p style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '14px',
              color: '#666',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              도와준 학생을 선택하면 포인트 1점이 지급됩니다.
            </p>

            {/* 학생 목록 */}
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {helpingStudents.map((student) => (
                <div
                  key={student.student_id}
                  onClick={() => setSelectedStudent(student.student_id)}
                  style={{
                    padding: '12px 16px',
                    marginBottom: '8px',
                    border: selectedStudent === student.student_id ? '2px solid #B8D4D9' : '2px solid #E0E0E0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedStudent === student.student_id ? '#F0F8FA' : 'white',
                    transition: 'all 0.2s',
                    fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#333'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedStudent !== student.student_id) {
                      e.target.style.background = '#F5F5F5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedStudent !== student.student_id) {
                      e.target.style.background = 'white'
                    }
                  }}
                >
                  {student.name}
                </div>
              ))}
            </div>

            {/* 버튼 */}
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedStudent(null)
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  color: '#666',
                  background: 'white',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                취소
              </button>

              <button
                onClick={handleConfirm}
                disabled={loading || !selectedStudent}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  color: 'white',
                  background: loading || !selectedStudent ? '#ccc' : '#B8D4D9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading || !selectedStudent ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default HelpThanksButton
