import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginAdmin } from '../services/authService'
import '../styles/admin.css'

/**
 * 관리자 로그인 페이지
 * - 비밀번호: teacher123
 */
function AdminLoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
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
      const result = await loginAdmin(password)
      
      if (result.success) {
        // 로그인 성공: 관리자 세션 저장
        localStorage.setItem('isAdmin', 'true')
        
        // 관리자 페이지로 이동
        navigate('/admin')
      } else {
        setError(result.error || '로그인에 실패했습니다.')
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
      console.error('관리자 로그인 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container admin">
      <div className="login-box">
        <h1 className="login-title">도와줄래?</h1>
        <p className="login-subtitle">관리자 로그인</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button admin"
            disabled={loading || !password}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="back-link"
            onClick={() => navigate('/student/login')}
            disabled={loading}
          >
            ← 학생 로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLoginPage
