import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import './AdminRoleTab.css'

/**
 * 역할배정 관리 탭
 * - 세션 생성: 역할 목록 정의
 * - 세션 배부: 학급별 랜덤 배정
 * - 세션 수정: 기존 세션 편집
 */
function AdminRoleTab() {
  const [sessions, setSessions] = useState([])
  const [expandedSection, setExpandedSection] = useState(null)
  
  // 세션 생성
  const [newSessionName, setNewSessionName] = useState('')
  const [newRoles, setNewRoles] = useState([''])
  
  // 세션 배부
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [classInput, setClassInput] = useState('')
  const [assignmentResults, setAssignmentResults] = useState([])
  
  // 세션 수정
  const [editingSession, setEditingSession] = useState(null)
  const [editSessionName, setEditSessionName] = useState('')
  const [editRoles, setEditRoles] = useState([])

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('role_sessions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setSessions(data || [])
  }

  // === 세션 생성 ===
  const addRole = () => {
    setNewRoles([...newRoles, ''])
  }

  const removeRole = (index) => {
    setNewRoles(newRoles.filter((_, i) => i !== index))
  }

  const updateRole = (index, value) => {
    const updated = [...newRoles]
    updated[index] = value
    setNewRoles(updated)
  }

  const saveSession = async () => {
    if (!newSessionName.trim()) {
      alert('세션 이름을 입력하세요')
      return
    }

    const validRoles = newRoles.filter(r => r.trim())
    if (validRoles.length === 0) {
      alert('최소 1개 이상의 역할을 입력하세요')
      return
    }

    const { error } = await supabase
      .from('role_sessions')
      .insert({
        session_name: newSessionName,
        roles: validRoles
      })

    if (!error) {
      alert('세션이 저장되었습니다')
      setNewSessionName('')
      setNewRoles([''])
      fetchSessions()
      setExpandedSection(null)
    } else {
      alert('저장 실패: ' + error.message)
    }
  }

  // === 세션 배부 ===
  const assignRoles = async () => {
    if (!selectedSessionId) {
      alert('세션을 선택하세요')
      return
    }

    const session = sessions.find(s => s.id === parseInt(selectedSessionId))
    const classes = classInput.split(',').map(c => c.trim()).filter(c => c)

    if (classes.length === 0) {
      alert('학급을 입력하세요 (예: 3-1, 3-2)')
      return
    }

    const results = []

    for (const className of classes) {
      // "3-1" → grade: 3, class_number: 1
      const [grade, classNumber] = className.split('-').map(Number)
      
      if (!grade || !classNumber) {
        results.push({ className, error: '잘못된 학급 형식 (예: 3-1)' })
        continue
      }

      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('grade', grade)
        .eq('class_number', classNumber)
      
      if (studentsError) {
        console.error('학생 조회 에러:', studentsError)
        results.push({ className, error: '학생 조회 실패: ' + studentsError.message })
        continue
      }

      if (!students || students.length === 0) {
        results.push({ className, error: '학생이 없습니다' })
        continue
      }

      // 역할 배열 생성 (골고루 분배)
      const studentCount = students.length
      const roleCount = session.roles.length
      const baseCount = Math.floor(studentCount / roleCount)
      const remainder = studentCount % roleCount

      const roleArray = []
      session.roles.forEach((role, index) => {
        const count = baseCount + (index < remainder ? 1 : 0)
        for (let i = 0; i < count; i++) {
          roleArray.push(role)
        }
      })

      // 랜덤 셔플
      const shuffledRoles = roleArray.sort(() => Math.random() - 0.5)

      // 배정 기록
      const assignments = students.map((student, index) => ({
        session_id: session.id,
        session_name: session.session_name,
        class_name: className,
        student_id: student.student_id,
        student_name: student.name,
        assigned_role: shuffledRoles[index]
      }))

      await supabase.from('role_assignments').insert(assignments)

      // student_roles 업데이트
      const roleUpdates = students.map((student, index) => ({
        student_id: student.student_id,
        student_name: student.name,
        role_name: shuffledRoles[index],
        is_active: true
      }))

      // 기존 역할 비활성화
      await supabase
        .from('student_roles')
        .update({ is_active: false })
        .in('student_id', students.map(s => s.student_id))

      // 새 역할 삽입
      await supabase.from('student_roles').insert(roleUpdates)

      results.push({
        className,
        assignments: students.map((s, i) => ({
          studentId: s.student_id,
          studentName: s.name,
          role: shuffledRoles[i]
        }))
      })
    }

    setAssignmentResults(results)
    alert('배정 완료!')
  }

  const cancelAssignments = async () => {
    if (!selectedSessionId) {
      alert('세션을 먼저 선택하세요')
      return
    }

    if (!confirm('선택한 세션의 모든 배부를 취소하시겠습니까?')) return

    const sessionId = parseInt(selectedSessionId)

    // 1. 해당 세션의 배부 기록 조회 (학생 목록 확보)
    const { data: assignments, error: fetchError } = await supabase
      .from('role_assignments')
      .select('student_id')
      .eq('session_id', sessionId)

    if (fetchError) {
      console.error('배부 취소 - 배정 조회 오류:', fetchError)
      alert('배정 정보를 불러오지 못했습니다.')
      return
    }

    const studentIds = (assignments || [])
      .map(a => a.student_id)
      .filter(Boolean)

    // 2. 학생 역할 비활성화
    if (studentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('student_roles')
        .update({ is_active: false })
        .in('student_id', studentIds)
        .eq('is_active', true)

      if (updateError) {
        console.error('배부 취소 - 역할 비활성화 오류:', updateError)
        alert('학생 역할을 초기화하지 못했습니다.')
        return
      }
    }

    // 3. 배부 기록 삭제
    const { error: deleteError } = await supabase
      .from('role_assignments')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) {
      console.error('배부 취소 - 기록 삭제 오류:', deleteError)
      alert('배부 기록을 삭제하지 못했습니다.')
      return
    }

    setAssignmentResults([])
    alert('세션 배부가 취소되었습니다.')
  }

  // === 세션 수정 ===
  const startEdit = (session) => {
    setEditingSession(session)
    setEditSessionName(session.session_name)
    setEditRoles([...session.roles])
    setExpandedSection('edit')
  }

  const updateEditRole = (index, value) => {
    const updated = [...editRoles]
    updated[index] = value
    setEditRoles(updated)
  }

  const addEditRole = () => {
    setEditRoles([...editRoles, ''])
  }

  const removeEditRole = (index) => {
    setEditRoles(editRoles.filter((_, i) => i !== index))
  }

  const saveEdit = async () => {
    if (!editSessionName.trim()) {
      alert('세션 이름을 입력하세요')
      return
    }

    const validRoles = editRoles.filter(r => r.trim())
    if (validRoles.length === 0) {
      alert('최소 1개 이상의 역할을 입력하세요')
      return
    }

    const { error } = await supabase
      .from('role_sessions')
      .update({
        session_name: editSessionName,
        roles: validRoles,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingSession.id)

    if (!error) {
      alert('세션이 수정되었습니다')
      setEditingSession(null)
      fetchSessions()
      setExpandedSection(null)
    } else {
      alert('수정 실패: ' + error.message)
    }
  }

  const deleteSession = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('role_sessions')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('삭제되었습니다')
      fetchSessions()
    }
  }

  return (
    <div className="admin-role-tab">
      <h2>📋 역할배정 관리</h2>

      {/* 세션 생성 */}
      <div className="role-section">
        <button 
          className="section-toggle"
          onClick={() => setExpandedSection(expandedSection === 'create' ? null : 'create')}
        >
          {expandedSection === 'create' ? '▼' : '▶'} 세션 생성
        </button>

        {expandedSection === 'create' && (
          <div className="section-content">
            <input
              type="text"
              placeholder="세션 이름 (예: 마피아 게임)"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="session-name-input"
            />

            <div className="roles-list">
              <label>역할 목록:</label>
              {newRoles.map((role, index) => (
                <div key={index} className="role-item">
                  <input
                    type="text"
                    placeholder={`역할 ${index + 1}`}
                    value={role}
                    onChange={(e) => updateRole(index, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addRole()
                        // 다음 input으로 포커스 이동
                        setTimeout(() => {
                          const inputs = document.querySelectorAll('.role-item input')
                          if (inputs[index + 1]) {
                            inputs[index + 1].focus()
                          }
                        }, 50)
                      }
                    }}
                  />
                  <button onClick={() => removeRole(index)}>X</button>
                </div>
              ))}
              <button onClick={addRole} className="add-role-btn">+ 역할 추가</button>
            </div>

            <button onClick={saveSession} className="save-btn">세션 저장</button>
          </div>
        )}
      </div>

      {/* 세션 배부 */}
      <div className="role-section">
        <button 
          className="section-toggle"
          onClick={() => setExpandedSection(expandedSection === 'assign' ? null : 'assign')}
        >
          {expandedSection === 'assign' ? '▼' : '▶'} 세션 배부
        </button>

        {expandedSection === 'assign' && (
          <div className="section-content">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="session-select"
            >
              <option value="">세션 선택</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.session_name} ({s.roles.length}개 역할)
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="학급 입력 (예: 3-1, 3-2)"
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              className="class-input"
            />

            <button onClick={assignRoles} className="assign-btn">배정하기</button>
            <button onClick={cancelAssignments} className="cancel-assign-btn">배부 취소</button>

            {assignmentResults.length > 0 && (
              <div className="assignment-results">
                <h4>배정 결과:</h4>
                {assignmentResults.map((result, idx) => (
                  <div key={idx} className="result-class">
                    <strong>{result.className}:</strong>
                    {result.error ? (
                      <p className="error">{result.error}</p>
                    ) : (
                      <ul>
                        {result.assignments.map((a, i) => (
                          <li key={i}>
                            {a.studentId} {a.studentName} → {a.role}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 세션 수정 */}
      <div className="role-section">
        <button 
          className="section-toggle"
          onClick={() => setExpandedSection(expandedSection === 'edit' ? null : 'edit')}
        >
          {expandedSection === 'edit' ? '▼' : '▶'} 세션 수정
        </button>

        {expandedSection === 'edit' && (
          <div className="section-content">
            <div className="sessions-list">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-header">
                    <strong>{session.session_name}</strong>
                    <div>
                      <button onClick={() => startEdit(session)} className="edit-btn-small">수정</button>
                      <button onClick={() => deleteSession(session.id)} className="delete-btn-small">삭제</button>
                    </div>
                  </div>
                  <div className="session-roles">
                    {session.roles.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            {editingSession && (
              <div className="edit-form">
                <h4>세션 수정: {editingSession.session_name}</h4>
                <input
                  type="text"
                  placeholder="세션 이름"
                  value={editSessionName}
                  onChange={(e) => setEditSessionName(e.target.value)}
                  className="session-name-input"
                />

                <div className="roles-list">
                  <label>역할 목록:</label>
                  {editRoles.map((role, index) => (
                    <div key={index} className="role-item">
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => updateEditRole(index, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addEditRole()
                            // 다음 input으로 포커스 이동
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('.edit-form .role-item input')
                              if (inputs[index + 1]) {
                                inputs[index + 1].focus()
                              }
                            }, 50)
                          }
                        }}
                      />
                      <button onClick={() => removeEditRole(index)}>X</button>
                    </div>
                  ))}
                  <button onClick={addEditRole} className="add-role-btn">+ 역할 추가</button>
                </div>

                <div className="edit-actions">
                  <button onClick={saveEdit} className="save-btn">저장</button>
                  <button onClick={() => setEditingSession(null)} className="cancel-btn">취소</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminRoleTab
