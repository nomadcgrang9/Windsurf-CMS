import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginStudent } from '../services/authService'
import '../styles/student.css'

/**
 * 학생 로그인 페이지
 * - 학번(4자리) + 이름으로 로그인
 * - 비밀번호 없음
 * - 하단에 관리자 로그인 버튼
 */
function StudentLoginPage() {
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * 로그인 처리
   */
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginStudent(studentId, name)
      
      if (result.success) {
        // 로그인 성공: 학생 정보를 localStorage에 저장
        localStorage.setItem('studentId', studentId)
        localStorage.setItem('studentName', name)
        
        // 학생 페이지로 이동
        navigate('/student')
      } else {
        setError(result.error || '로그인에 실패했습니다.')
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
      console.error('로그인 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 학번 입력 처리 (4자리 숫자만)
   */
  const handleStudentIdChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4)
    setStudentId(value)
  }

  return (
    <div className="login-container">
      {/* 메인 콘텐츠 */}
      <div className="login-content">
        <h1 className="login-title">도와줄래?</h1>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
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

          <div className="form-group">
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
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading || studentId.length !== 4 || !name.trim()}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <button
          type="button"
          className="admin-link"
          onClick={() => navigate('/admin/login')}
          disabled={loading}
        >
          관리자 로그인
        </button>
      </div>

      {/* 하단 캐릭터 영역 */}
      <div className="character-section">
        <div className="characters">
          <div className="character">
            <img src="/characters/boy-glasses.png" alt="학생" />
            <div className="character-speech-bubble">창건샘이 항상 하는 말!</div>
          </div>
          <div className="character">
            <img src="/characters/boy-orange.png" alt="학생" />
            <div className="character-speech-bubble">나는 못하지만</div>
          </div>
          <div className="character">
            <img src="/characters/girl-purple.png" alt="학생" />
            <div className="character-speech-bubble">우리는 할 수 있다</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentLoginPage
