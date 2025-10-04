import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { getActiveHelpRequests, createHelpRequest, cancelHelpRequest } from '../../services/helpService'
import './AdminHelpTab.css'

/**
 * 도움관리 탭
 * - 도움상황 리셋: 학급별/학년별/전체 리셋
 * - 도움 상태 지정: 도와줄래/도와줄게 지정 및 해제
 */
function AdminHelpTab() {
  const [accordions, setAccordions] = useState({ reset: false, assign: true })
  
  // 도움상황 리셋
  const [resetInput, setResetInput] = useState('')
  
  // 도움 상태 지정
  const [classInput, setClassInput] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')

  // === 도움상황 리셋 ===
  const parseResetScope = (input) => {
    const trimmed = input.trim()
    
    if (trimmed === '전체') {
      return { grade: null, classNumber: null, label: '전체' }
    }
    
    if (trimmed.includes('학년')) {
      const grade = parseInt(trimmed.replace('학년', ''))
      if (isNaN(grade)) return null
      return { grade, classNumber: null, label: `${grade}학년 전체` }
    }
    
    if (trimmed.includes('-')) {
      const [grade, classNumber] = trimmed.split('-').map(Number)
      if (isNaN(grade) || isNaN(classNumber)) return null
      return { grade, classNumber, label: `${grade}학년 ${classNumber}반` }
    }
    
    return null
  }

  const handleReset = async () => {
    const scope = parseResetScope(resetInput)
    
    if (!scope) {
      alert('올바른 형식으로 입력하세요.\n예시: 3-1, 3학년, 전체')
      return
    }

    if (!confirm(`${scope.label}의 모든 도움 상태를 리셋하시겠습니까?`)) {
      return
    }

    try {
      let query = supabase
        .from('help_requests')
        .update({ is_active: false })
        .eq('is_active', true)

      if (scope.grade !== null) {
        // 학생 ID로 필터링하기 위해 먼저 학생 목록 조회
        let studentQuery = supabase
          .from('students')
          .select('student_id')
          .eq('grade', scope.grade)

        if (scope.classNumber !== null) {
          studentQuery = studentQuery.eq('class_number', scope.classNumber)
        }

        const { data: studentData, error: studentError } = await studentQuery

        if (studentError) throw studentError

        const studentIds = studentData.map(s => s.student_id)
        
        if (studentIds.length === 0) {
          alert('해당 학급에 학생이 없습니다.')
          return
        }

        query = query.in('student_id', studentIds)
      }

      const { error, count } = await query

      if (error) throw error

      alert(`✅ ${scope.label} 도움 상태가 리셋되었습니다.`)
      setResetInput('')
      
      // 현재 조회 중인 학급이 있으면 새로고침
      if (selectedClass) {
        fetchStudents(selectedClass)
      }
    } catch (error) {
      console.error('리셋 오류:', error)
      alert('리셋 중 오류가 발생했습니다.')
    }
  }

  // === 학급 조회 ===
  const fetchStudents = async (classInfo) => {
    if (!classInfo.trim()) {
      alert('학급을 입력하세요. (예: 3-1)')
      return
    }

    setLoading(true)
    try {
      const data = await getActiveHelpRequests(classInfo)
      setStudents(data)
      setSelectedClass(classInfo)
    } catch (error) {
      console.error('학급 조회 오류:', error)
      alert('학급 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // === 상태 지정 ===
  const handleAssignRequesting = async (studentId) => {
    try {
      await createHelpRequest(studentId, 'requesting')
      fetchStudents(selectedClass)
    } catch (error) {
      console.error('도와줄래 지정 오류:', error)
      alert('지정 중 오류가 발생했습니다.')
    }
  }

  const handleAssignHelping = async (studentId) => {
    try {
      await createHelpRequest(studentId, 'helping')
      fetchStudents(selectedClass)
    } catch (error) {
      console.error('도와줄게 지정 오류:', error)
      alert('지정 중 오류가 발생했습니다.')
    }
  }

  const handleCancel = async (studentId) => {
    try {
      await cancelHelpRequest(studentId)
      fetchStudents(selectedClass)
    } catch (error) {
      console.error('상태 해제 오류:', error)
      alert('해제 중 오류가 발생했습니다.')
    }
  }

  // === Realtime 구독 ===
  useEffect(() => {
    if (!selectedClass) return

    const channel = supabase
      .channel('admin_help_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests'
        },
        () => {
          fetchStudents(selectedClass)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedClass])

  return (
    <div className="admin-help-tab">
      <h2>🆘 도움관리</h2>

      {/* 도움상황 리셋 */}
      <div className="help-section">
        <button 
          className="section-toggle"
          onClick={() => setAccordions(prev => ({ ...prev, reset: !prev.reset }))}
        >
          {accordions.reset ? '▼' : '▶'} 도움상황 리셋
        </button>

        {accordions.reset && (
          <div className="section-content">
            <div className="reset-container">
              <input
                type="text"
                placeholder="학급 입력 (예: 3-1, 3학년, 전체)"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                className="reset-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleReset()
                }}
              />
              <button onClick={handleReset} className="reset-btn">리셋하기</button>
            </div>

            <div className="reset-guide">
              <p>💡 사용 예시:</p>
              <ul>
                <li><strong>3-1</strong> → 3학년 1반 리셋</li>
                <li><strong>3학년</strong> → 3학년 전체 리셋</li>
                <li><strong>전체</strong> → 모든 학급 리셋</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 도움 상태 지정 */}
      <div className="help-section">
        <button 
          className="section-toggle"
          onClick={() => setAccordions(prev => ({ ...prev, assign: !prev.assign }))}
        >
          {accordions.assign ? '▼' : '▶'} 도움 상태 지정
        </button>

        {accordions.assign && (
          <div className="section-content">
            <div className="class-select-container">
              <input
                type="text"
                placeholder="학급 선택 (예: 3-1)"
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                className="class-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') fetchStudents(classInput)
                }}
              />
              <button onClick={() => fetchStudents(classInput)} className="query-btn">
                조회하기
              </button>
            </div>

            {loading ? (
              <div className="loading-message">불러오는 중...</div>
            ) : students.length > 0 ? (
              <div className="students-container">
                <h3>📋 {selectedClass} 도움 현황</h3>
                <div className="students-grid">
                  {students.map((student) => (
                    <div key={student.student_id} className="student-card">
                      <div className="student-name">{student.name}</div>
                      <div className="student-status-icon">
                        {student.status === 'requesting' ? '🟠' : 
                         student.status === 'helping' ? '🔵' : '⚪'}
                      </div>
                      <div className="student-buttons">
                        <button
                          className={`btn-requesting ${student.status === 'requesting' ? 'active' : ''}`}
                          onClick={() => handleAssignRequesting(student.student_id)}
                        >
                          🟠
                        </button>
                        <button
                          className={`btn-helping ${student.status === 'helping' ? 'active' : ''}`}
                          onClick={() => handleAssignHelping(student.student_id)}
                        >
                          🔵
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancel(student.student_id)}
                          disabled={!student.is_active}
                        >
                          해제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminHelpTab
