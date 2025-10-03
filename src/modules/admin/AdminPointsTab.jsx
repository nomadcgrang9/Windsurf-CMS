import { useState, useEffect } from 'react'
import { getStudentsByClass } from '../../services/studentService'
import { getDailyPoints, updateDailyPoints } from '../../services/pointService'
import { supabase } from '../../services/supabaseClient'

/**
 * 관리자 - 포인트 관리 탭
 * - 학급 타이핑 조회 (3-1, 4-2 등)
 * - 학급 전체 학생 목록 + 포인트 현황
 * - 개별 학생 포인트 수정
 * - Realtime 구독으로 실시간 업데이트
 */
function AdminPointsTab() {
  const [classInfo, setClassInfo] = useState('')
  const [students, setStudents] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingPoints, setEditingPoints] = useState({}) // { studentId: points }

  // 학급 조회
  const handleFetchClass = async () => {
    if (!classInfo.trim()) {
      setMessage('❌ 학급을 입력해주세요 (예: 3-1)')
      return
    }

    // 학급 파싱 (3-1 → grade:3, class:1)
    const parts = classInfo.split('-')
    if (parts.length !== 2) {
      setMessage('❌ 올바른 형식으로 입력해주세요 (예: 3-1, 4-2)')
      return
    }

    const grade = parseInt(parts[0])
    const classNum = parseInt(parts[1])

    if (![3, 4, 6].includes(grade)) {
      setMessage('❌ 학년은 3, 4, 6만 가능합니다')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 1. 학급 학생 조회
      const studentList = await getStudentsByClass(grade, classNum)
      
      if (studentList.length === 0) {
        setMessage(`⚠️ ${classInfo} 학급에 등록된 학생이 없습니다.`)
        setStudents([])
        setLoading(false)
        return
      }

      // 2. 각 학생의 포인트 조회
      const studentsWithPoints = await Promise.all(
        studentList.map(async (student) => {
          try {
            const points = await getDailyPoints(student.student_id)
            return {
              ...student,
              current_points: points?.current_points || 0,
              max_points: points?.max_points || 20
            }
          } catch (error) {
            console.error(`${student.student_id} 포인트 조회 실패:`, error)
            return {
              ...student,
              current_points: 0,
              max_points: 20
            }
          }
        })
      )

      setStudents(studentsWithPoints)
      
      // 편집용 포인트 초기화
      const initialPoints = {}
      studentsWithPoints.forEach(s => {
        initialPoints[s.student_id] = s.current_points
      })
      setEditingPoints(initialPoints)

      setMessage(`✅ ${classInfo} 학급 ${studentsWithPoints.length}명 조회 완료`)
    } catch (error) {
      console.error('학급 조회 오류:', error)
      setMessage('❌ 학급 조회 중 오류가 발생했습니다.')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  // 포인트 입력 변경
  const handlePointsChange = (studentId, value) => {
    const points = parseInt(value)
    if (isNaN(points) || points < 0 || points > 20) return
    
    setEditingPoints(prev => ({
      ...prev,
      [studentId]: points
    }))
  }

  // 개별 학생 포인트 수정
  const handleUpdateStudent = async (studentId, studentName) => {
    const newPoints = editingPoints[studentId]
    
    if (newPoints === undefined || newPoints < 0 || newPoints > 20) {
      alert('포인트는 0-20 사이의 숫자여야 합니다.')
      return
    }

    try {
      await updateDailyPoints(studentId, newPoints)
      
      // 학생 목록 업데이트
      setStudents(prev => prev.map(s => 
        s.student_id === studentId 
          ? { ...s, current_points: newPoints }
          : s
      ))

      setMessage(`✅ ${studentName}(${studentId})의 포인트가 ${newPoints}로 업데이트되었습니다.`)
    } catch (error) {
      console.error('포인트 업데이트 오류:', error)
      alert('포인트 업데이트에 실패했습니다.')
    }
  }

  // Realtime 구독 (학생 목록이 있을 때만)
  useEffect(() => {
    if (students.length === 0) return

    const subscription = supabase
      .channel('daily_points_admin')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_points'
      }, (payload) => {
        // 포인트 변경 감지
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updatedStudentId = payload.new.student_id
          
          // 현재 조회된 학생 목록에 포함된 학생인지 확인
          const isInCurrentList = students.some(s => s.student_id === updatedStudentId)
          
          if (isInCurrentList) {
            // 학생 목록 업데이트
            setStudents(prev => prev.map(s => 
              s.student_id === updatedStudentId
                ? { ...s, current_points: payload.new.current_points }
                : s
            ))
            
            // 편집 중인 포인트도 업데이트
            setEditingPoints(prev => ({
              ...prev,
              [updatedStudentId]: payload.new.current_points
            }))
          }
        }
      })
      .subscribe()

    // cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [students])

  // 평균 포인트 계산
  const averagePoints = students.length > 0
    ? (students.reduce((sum, s) => sum + s.current_points, 0) / students.length).toFixed(1)
    : 0

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#333',
        marginBottom: '10px'
      }}>
        🎯 포인트 관리
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px'
      }}>
        학급을 입력하여 전체 학생의 포인트를 조회하고 수정하세요.
      </p>

      {/* 학급 입력 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <input
          type="text"
          value={classInfo}
          onChange={(e) => setClassInfo(e.target.value)}
          placeholder="학급 입력 (예: 3-1, 4-2, 6-7)"
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #E0E0E0',
            borderRadius: '8px',
            outline: 'none'
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleFetchClass()
          }}
        />
        <button
          onClick={handleFetchClass}
          disabled={loading}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'white',
            background: loading ? '#ccc' : '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.target.style.background = '#5568d3'
          }}
          onMouseLeave={(e) => {
            if (!loading) e.target.style.background = '#667eea'
          }}
        >
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: message.startsWith('✅') ? '#E8F5E9' : message.startsWith('⚠️') ? '#FFF3E0' : '#FFEBEE',
          color: message.startsWith('✅') ? '#2E7D32' : message.startsWith('⚠️') ? '#F57C00' : '#C62828',
          fontSize: '16px',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          {message}
        </div>
      )}

      {/* 학생 목록 */}
      {students.length > 0 && (
        <div style={{
          border: '1px solid #E0E0E0',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            background: '#F5F5F5',
            borderBottom: '1px solid #E0E0E0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#333',
              margin: 0
            }}>
              {classInfo} 학생 목록
            </h3>
            <div style={{
              fontSize: '14px',
              color: '#666'
            }}>
              총 {students.length}명 | 평균 포인트: {averagePoints}
            </div>
          </div>

          <div style={{
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead style={{
                background: '#FAFAFA',
                position: 'sticky',
                top: 0
              }}>
                <tr>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0',
                    width: '15%'
                  }}>학번</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0',
                    width: '20%'
                  }}>이름</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0',
                    width: '25%'
                  }}>현재 포인트</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0',
                    width: '25%'
                  }}>포인트 수정</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0',
                    width: '15%'
                  }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.student_id} style={{
                    borderBottom: '1px solid #F0F0F0'
                  }}>
                    <td style={{
                      padding: '12px 20px',
                      fontSize: '14px',
                      color: '#333'
                    }}>{student.student_id}</td>
                    <td style={{
                      padding: '12px 20px',
                      fontSize: '14px',
                      color: '#333'
                    }}>{student.name}</td>
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 700,
                        color: student.current_points >= 20 ? '#E74C3C' : '#667eea'
                      }}>
                        {student.current_points} / {student.max_points}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'center'
                    }}>
                      <input
                        type="number"
                        value={editingPoints[student.student_id] ?? student.current_points}
                        onChange={(e) => handlePointsChange(student.student_id, e.target.value)}
                        min="0"
                        max="20"
                        style={{
                          width: '80px',
                          padding: '8px',
                          fontSize: '14px',
                          border: '2px solid #E0E0E0',
                          borderRadius: '6px',
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </td>
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'center'
                    }}>
                      <button
                        onClick={() => handleUpdateStudent(student.student_id, student.name)}
                        style={{
                          padding: '6px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'white',
                          background: '#667eea',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#5568d3'}
                        onMouseLeave={(e) => e.target.style.background = '#667eea'}
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 안내 */}
      {students.length === 0 && !loading && (
        <div style={{
          padding: '60px 40px',
          textAlign: 'center',
          background: '#FAFAFA',
          borderRadius: '8px',
          border: '1px solid #E0E0E0'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#999',
            margin: 0
          }}>
            학급을 입력하고 조회 버튼을 클릭하세요.
          </p>
        </div>
      )}
    </div>
  )
}

export default AdminPointsTab
