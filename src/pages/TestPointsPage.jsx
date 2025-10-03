import { useState } from 'react'
import { getDailyPoints, updateDailyPoints } from '../services/pointService'

/**
 * 포인트 테스트 페이지
 * - 학생 ID 입력하여 포인트 조회
 * - 포인트 수정 (실시간 반영)
 * - 학생 페이지와 연동 테스트용
 */
function TestPointsPage() {
  const [studentId, setStudentId] = useState('3101')
  const [studentName, setStudentName] = useState('고유원')
  const [currentPoints, setCurrentPoints] = useState(null)
  const [maxPoints, setMaxPoints] = useState(20)
  const [newPoints, setNewPoints] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // 포인트 조회
  const handleFetchPoints = async () => {
    if (!studentId.trim()) {
      setMessage('❌ 학번을 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const points = await getDailyPoints(studentId)
      
      if (points) {
        setCurrentPoints(points.current_points)
        setMaxPoints(points.max_points)
        setNewPoints(points.current_points.toString())
        setMessage(`✅ ${studentId} ${studentName}의 포인트: ${points.current_points}/${points.max_points}`)
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error)
      setMessage('❌ 포인트 조회 실패: ' + error.message)
      setCurrentPoints(null)
    } finally {
      setLoading(false)
    }
  }

  // 포인트 수정
  const handleUpdatePoints = async () => {
    if (currentPoints === null) {
      setMessage('❌ 먼저 포인트를 조회해주세요.')
      return
    }

    const points = parseInt(newPoints)
    if (isNaN(points) || points < 0 || points > 20) {
      setMessage('❌ 포인트는 0-20 사이의 숫자여야 합니다.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const updated = await updateDailyPoints(studentId, points)
      
      setCurrentPoints(updated.current_points)
      setMessage(`✅ 포인트가 ${updated.current_points}로 업데이트되었습니다! (학생 페이지에 실시간 반영됨)`)
    } catch (error) {
      console.error('포인트 업데이트 오류:', error)
      setMessage('❌ 포인트 업데이트 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 빠른 설정 버튼
  const quickSet = (points) => {
    setNewPoints(points.toString())
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: "'Pretendard', sans-serif"
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#333',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          🎯 포인트 테스트
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          학생 ID를 입력하고 포인트를 조회/수정하세요. 학생 페이지에 실시간 반영됩니다.
        </p>

        {/* 학생 정보 입력 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px'
            }}>
              학번
            </label>
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="예: 3101"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #E0E0E0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px'
            }}>
              이름
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="예: 고유원"
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #E0E0E0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />
          </div>
        </div>

        {/* 포인트 조회 버튼 */}
        <button
          onClick={handleFetchPoints}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            fontWeight: 600,
            color: 'white',
            background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            marginBottom: '32px'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          {loading ? '조회 중...' : '포인트 조회'}
        </button>

        {/* 현재 포인트 표시 */}
        {currentPoints !== null && (
          <div style={{
            background: '#F0F8FF',
            border: '2px solid #667eea',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '12px'
            }}>
              {studentId} {studentName}
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              color: currentPoints >= maxPoints ? '#E74C3C' : '#667eea',
              marginBottom: '8px'
            }}>
              {currentPoints} / {maxPoints}
            </div>
            <div style={{
              width: '100%',
              height: '32px',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '16px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(currentPoints / maxPoints) * 100}%`,
                height: '100%',
                background: currentPoints >= maxPoints ? '#E74C3C' : '#667eea',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>
        )}

        {/* 포인트 수정 */}
        {currentPoints !== null && (
          <div style={{
            border: '2px solid #E0E0E0',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '16px'
            }}>
              포인트 수정
            </h3>

            {/* 빠른 설정 버튼 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}>
              {[0, 5, 10, 15, 20].map((points) => (
                <button
                  key={points}
                  onClick={() => quickSet(points)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#667eea',
                    background: 'white',
                    border: '2px solid #667eea',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#667eea'
                    e.target.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white'
                    e.target.style.color = '#667eea'
                  }}
                >
                  {points}
                </button>
              ))}
            </div>

            {/* 포인트 입력 */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                min="0"
                max="20"
                placeholder="0-20"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '18px',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  textAlign: 'center',
                  fontWeight: 600
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
              />
            </div>

            {/* 업데이트 버튼 */}
            <button
              onClick={handleUpdatePoints}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'white',
                background: loading ? '#ccc' : '#667eea',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = '#5568d3'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#667eea'
              }}
            >
              {loading ? '업데이트 중...' : '포인트 업데이트'}
            </button>
          </div>
        )}

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

        {/* 안내 */}
        <div style={{
          padding: '20px',
          background: '#F5F5F5',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '12px'
          }}>
            📌 사용 방법
          </h3>
          <ol style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.8',
            paddingLeft: '20px',
            margin: 0
          }}>
            <li>학번과 이름을 입력합니다 (예: 3101, 고유원)</li>
            <li>"포인트 조회" 버튼을 클릭합니다</li>
            <li>현재 포인트가 표시됩니다</li>
            <li>빠른 설정 버튼 또는 직접 입력으로 포인트를 변경합니다</li>
            <li>"포인트 업데이트" 버튼을 클릭합니다</li>
            <li>학생 페이지에서 실시간으로 반영되는지 확인합니다</li>
          </ol>
        </div>

        {/* 학생 페이지 링크 */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <a
            href="/student/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#667eea',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#667eea'
              e.target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white'
              e.target.style.color = '#667eea'
            }}
          >
            학생 로그인 페이지로 이동 →
          </a>
        </div>
      </div>
    </div>
  )
}

export default TestPointsPage
