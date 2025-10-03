import { useState, useEffect } from 'react'
import { createOrUpdateStudent, getAllStudentsWithLoginStatus } from '../../services/studentService'
import { supabase } from '../../services/supabaseClient'

/**
 * 관리자 - 학급 관리 탭
 * - CSV 파일 업로드 (학번, 이름)
 * - 학급별 필터링 (3-1 타이핑)
 * - 개별 학생 추가/수정/삭제
 * - 학번 자동 파싱 (3101 → 3학년 1반 1번)
 */
function AdminClassTab() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [classFilter, setClassFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({ studentId: '', name: '' })

  // 전체 학생 목록 조회
  const fetchStudents = async () => {
    setLoading(true)
    try {
      const data = await getAllStudentsWithLoginStatus()
      setStudents(data)
    } catch (error) {
      console.error('학생 목록 조회 오류:', error)
      setMessage('❌ 학생 목록을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 학생 목록 조회
  useEffect(() => {
    fetchStudents()
  }, [])

  // 학급 필터링
  useEffect(() => {
    if (!classFilter.trim()) {
      setFilteredStudents(students)
      return
    }

    const parts = classFilter.split('-')
    if (parts.length !== 2) {
      setFilteredStudents(students)
      return
    }

    const grade = parseInt(parts[0])
    const classNum = parseInt(parts[1])

    const filtered = students.filter(s => 
      s.grade === grade && s.class_number === classNum
    )
    setFilteredStudents(filtered)
  }, [classFilter, students])

  // 학생 추가
  const handleAddStudent = async () => {
    if (!newStudent.studentId || !newStudent.name) {
      alert('학번과 이름을 입력해주세요.')
      return
    }

    const grade = parseInt(newStudent.studentId[0])
    const classNum = parseInt(newStudent.studentId[1])
    const number = parseInt(newStudent.studentId.slice(2))

    if (![3, 4, 6].includes(grade)) {
      alert('학년은 3, 4, 6만 가능합니다.')
      return
    }

    try {
      await createOrUpdateStudent({
        student_id: newStudent.studentId,
        name: newStudent.name,
        grade,
        class_number: classNum,
        student_number: number
      })
      setMessage(`✅ ${newStudent.name} 학생이 추가되었습니다.`)
      setShowAddModal(false)
      setNewStudent({ studentId: '', name: '' })
      await fetchStudents()
    } catch (error) {
      alert('학생 추가에 실패했습니다.')
    }
  }

  // 학생 수정
  const handleUpdateStudent = async (student) => {
    const newName = prompt('새 이름을 입력하세요:', student.name)
    if (!newName || newName === student.name) return

    try {
      await createOrUpdateStudent({
        student_id: student.student_id,
        name: newName,
        grade: student.grade,
        class_number: student.class_number,
        student_number: student.student_number
      })
      setMessage(`✅ ${student.student_id} 학생 정보가 수정되었습니다.`)
      await fetchStudents()
    } catch (error) {
      alert('학생 수정에 실패했습니다.')
    }
  }

  // 학생 삭제
  const handleDeleteStudent = async (student) => {
    if (!confirm(`${student.name}(${student.student_id}) 학생을 삭제하시겠습니까?`)) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id', student.student_id)

      if (error) throw error

      setMessage(`✅ ${student.name} 학생이 삭제되었습니다.`)
      await fetchStudents()
    } catch (error) {
      alert('학생 삭제에 실패했습니다.')
    }
  }

  // CSV 파일 업로드 처리
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploadLoading(true)
    setMessage('')

    const reader = new FileReader()
    
    reader.onload = async (event) => {
      try {
        const csv = event.target.result
        const lines = csv.split('\n').filter(line => line.trim())
        
        // 첫 줄 제외 (헤더: 학번,이름)
        const studentLines = lines.slice(1)
        const studentsToUpload = []

        for (const line of studentLines) {
          const [studentId, name] = line.split(',').map(s => s.trim())
          
          if (!studentId || !name) continue

          // 학번 파싱: 3101 → grade:3, class:1, number:1
          const grade = parseInt(studentId[0])
          const classNum = parseInt(studentId[1])
          const number = parseInt(studentId.slice(2))

          // 유효성 검사
          if (![3, 4, 6].includes(grade)) {
            console.warn(`잘못된 학년: ${studentId}`)
            continue
          }

          studentsToUpload.push({
            student_id: studentId,
            name: name,
            grade: grade,
            class_number: classNum,
            student_number: number
          })
        }

        // Supabase에 업로드
        let successCount = 0
        for (const student of studentsToUpload) {
          try {
            await createOrUpdateStudent(student)
            successCount++
          } catch (error) {
            console.error(`${student.student_id} 업로드 실패:`, error)
          }
        }

        setMessage(`✅ ${successCount}명의 학생이 업로드되었습니다!`)
        
        // 학생 목록 새로고침
        await fetchStudents()
      } catch (error) {
        console.error('CSV 파일 처리 오류:', error)
        setMessage('❌ CSV 파일 처리 중 오류가 발생했습니다.')
      } finally {
        setUploadLoading(false)
        // 파일 입력 초기화
        e.target.value = ''
      }
    }

    reader.onerror = () => {
      setMessage('❌ 파일을 읽을 수 없습니다.')
      setUploadLoading(false)
    }

    reader.readAsText(file, 'UTF-8')
  }

  // 로그인 통계
  const displayStudents = classFilter ? filteredStudents : students
  const loggedInCount = displayStudents.filter(s => s.is_logged_in).length
  const totalCount = displayStudents.length

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
        👥 학급 관리
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px'
      }}>
        CSV 파일 업로드 또는 개별 학생 관리가 가능합니다.
      </p>

      {/* 학급 필터 및 학생 추가 버튼 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px'
      }}>
        <input
          type="text"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          placeholder="학급 필터 (예: 3-1, 4-2)"
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '16px',
            border: '2px solid #E0E0E0',
            borderRadius: '8px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'white',
            background: '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          + 학생 추가
        </button>
      </div>

      {/* CSV 파일 업로드 */}
      <div style={{
        padding: '24px',
        background: '#F5F5F5',
        borderRadius: '8px',
        border: '1px solid #E0E0E0',
        marginBottom: '32px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#333',
          marginBottom: '16px'
        }}>
          📁 CSV 파일 업로드
        </h3>
        
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploadLoading}
          style={{
            padding: '12px',
            fontSize: '14px',
            border: '2px solid #E0E0E0',
            borderRadius: '6px',
            background: 'white',
            cursor: uploadLoading ? 'not-allowed' : 'pointer',
            width: '100%'
          }}
        />
        
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'white',
          borderRadius: '6px',
          border: '1px solid #E0E0E0'
        }}>
          <p style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            CSV 파일 형식:
          </p>
          <pre style={{
            fontSize: '13px',
            color: '#666',
            background: '#FAFAFA',
            padding: '12px',
            borderRadius: '4px',
            overflow: 'auto',
            margin: 0
          }}>
{`학번,이름
3101,고유원
3102,김지성
3103,신유나
4201,박서준
4202,이지은`}
          </pre>
          <p style={{
            fontSize: '12px',
            color: '#999',
            marginTop: '8px',
            margin: 0
          }}>
            💡 학번 형식: 3101 = 3학년 1반 1번 / 4201 = 4학년 2반 1번
          </p>
        </div>
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: message.startsWith('✅') ? '#E8F5E9' : '#FFEBEE',
          color: message.startsWith('✅') ? '#2E7D32' : '#C62828',
          fontSize: '16px',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          {message}
        </div>
      )}

      {/* 학생 목록 */}
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
            등록된 학생 목록
          </h3>
          <div style={{
            fontSize: '14px',
            color: '#666'
          }}>
            총 {totalCount}명 | 로그인: {loggedInCount}명 | 미로그인: {totalCount - loggedInCount}명
          </div>
        </div>

        {loading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999'
          }}>
            로딩 중...
          </div>
        ) : students.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999'
          }}>
            등록된 학생이 없습니다. CSV 파일을 업로드하세요.
          </div>
        ) : (
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
                    borderBottom: '1px solid #E0E0E0'
                  }}>학번</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0'
                  }}>이름</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0'
                  }}>학급</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0'
                  }}>로그인 상태</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#666',
                    borderBottom: '1px solid #E0E0E0'
                  }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student) => (
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
                      fontSize: '14px',
                      color: '#666'
                    }}>{student.grade}학년 {student.class_number}반 {student.student_number}번</td>
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        background: student.is_logged_in ? '#E8F5E9' : '#F5F5F5',
                        color: student.is_logged_in ? '#2E7D32' : '#999'
                      }}>
                        {student.is_logged_in ? '● 로그인 중' : '○ 미로그인'}
                      </span>
                    </td>
                    <td style={{
                      padding: '12px 20px',
                      textAlign: 'center'
                    }}>
                      <button
                        onClick={() => handleUpdateStudent(student)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#667eea',
                          background: 'white',
                          border: '1px solid #667eea',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '8px'
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#E74C3C',
                          background: 'white',
                          border: '1px solid #E74C3C',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 학생 추가 모달 */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '24px'
            }}>학생 추가</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '8px'
              }}>학번 (4자리)</label>
              <input
                type="text"
                value={newStudent.studentId}
                onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                placeholder="예: 3101"
                maxLength="4"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: '#333',
                marginBottom: '8px'
              }}>이름</label>
              <input
                type="text"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                placeholder="예: 홍길동"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '6px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewStudent({ studentId: '', name: '' })
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#666',
                  background: '#F5F5F5',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleAddStudent}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  background: '#667eea',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminClassTab
