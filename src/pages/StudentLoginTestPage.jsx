import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/student-test.css'

/**
 * 학생 로그인 테스트 페이지 (프로토타입)
 * - 레퍼런스 디자인 적용
 * - 파스텔 블루 배경
 * - 하단 캐릭터 일러스트
 */
function StudentLoginTestPage() {
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 임시 로그인 처리 (테스트용)
    setTimeout(() => {
      if (studentId && name) {
        alert('로그인 성공! (테스트 모드)')
        setLoading(false)
      } else {
        setError('학번과 이름을 입력해주세요.')
        setLoading(false)
      }
    }, 1000)
  }

  const handleStudentIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setStudentId(value)
  }

  return (
    <div className="test-login-container">
      {/* 메인 콘텐츠 */}
      <div className="test-login-content">
        <h1 className="test-login-title">도와줄래?</h1>

        <form onSubmit={handleLogin} className="test-login-form">
          <div className="test-form-group">
            <input
              type="text"
              id="studentId"
              value={studentId}
              onChange={handleStudentIdChange}
              placeholder="학번 (예: 3121)"
              maxLength="4"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="test-form-group">
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              maxLength="10"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="test-error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="test-login-button"
            disabled={loading || studentId.length !== 4 || !name.trim()}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <button
          type="button"
          className="test-admin-link"
          onClick={() => navigate('/admin/login')}
          disabled={loading}
        >
          관리자 로그인
        </button>
      </div>

      {/* 하단 캐릭터 영역 */}
      <div className="test-character-section">
        <div className="test-characters">
          <div className="test-character">
            <img src="/characters/boy-glasses.png" alt="학생" />
            <div className="character-speech-bubble">창건샘이 항상 하는 말!</div>
          </div>
          <div className="test-character">
            <img src="/characters/boy-orange.png" alt="학생" />
            <div className="character-speech-bubble">나는 못하지만</div>
          </div>
          <div className="test-character">
            <img src="/characters/girl-purple.png" alt="학생" />
            <div className="character-speech-bubble">우리는 할 수 있다</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentLoginTestPage
