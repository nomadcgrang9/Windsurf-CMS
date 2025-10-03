import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginStudent } from '../services/authService'
import { getHoverMessage } from '../services/hoverMessageService'
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
  const [hoverContent, setHoverContent] = useState({
    message: '창건샘 말씀하시길,\n나는 못하지만 친구는 할 수 있다!',
    imageUrl: '/characters/nini-rogin.png'
  })

  useEffect(() => {
    let mounted = true

    const loadHoverContent = async () => {
      try {
        const data = await getHoverMessage()
        if (!mounted || !data) return

        setHoverContent({
          message: data.message || '창건샘 말씀하시길,\n나는 못하지만 친구는 할 수 있다!',
          imageUrl: data.imageUrl || '/characters/nini-rogin.png'
        })
      } catch (hoverError) {
        console.error('말풍선 데이터 로드 실패:', hoverError)
      }
    }

    loadHoverContent()

    return () => {
      mounted = false
    }
  }, [])

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
      </div>

      {/* 하단 캐릭터 영역 */}
      <div className="character-section">
        <div className="character">
          <div className="character-speech-bubble">
            {hoverContent.message.split('\n').map((line, i) => (
              <div key={i}>
                {line}
                {i < hoverContent.message.split('\n').length - 1 && <br />}
              </div>
            ))}
          </div>
          <img src={hoverContent.imageUrl} alt="학생들" />
        </div>
      </div>
    </div>
  )
}

export default StudentLoginPage
