import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { logoutStudent } from '../../services/authService'

/**
 * 헤더 모듈
 * - 좌측: "도와줄래?" 타이틀
 * - 중앙: 학번 이름
 * - 우측: 로그아웃 버튼
 */
function HeaderModule() {
  const navigate = useNavigate()
  
  // localStorage에서 학생 정보 가져오기
  const studentId = localStorage.getItem('studentId') || '0000'
  const studentName = localStorage.getItem('studentName') || '학생'

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logoutStudent(studentId)
      localStorage.removeItem('studentId')
      localStorage.removeItem('studentName')
      navigate('/student/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      // 에러가 나도 로그아웃 처리
      localStorage.removeItem('studentId')
      localStorage.removeItem('studentName')
      navigate('/student/login')
    }
  }

  return (
    <div className="header-module">
      {/* 좌측 타이틀 */}
      <div className="header-title" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <img 
          src="/characters/header.png" 
          alt="도와줄래" 
          style={{
            width: '100px',
            height: '100px',
            objectFit: 'contain'
          }}
        />
        <h1 style={{
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          fontSize: '54px',
          fontWeight: 900,
          color: '#FFFFFF',
          margin: 0,
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          도와줄래?
        </h1>
      </div>

      {/* 우측 학생 정보 + 로그아웃 */}
      <div className="header-student-info">
        <span style={{
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          fontSize: '20px',
          fontWeight: 600,
          color: '#FFFFFF',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.1)'
        }}>
          {studentId} {studentName}
        </span>
        
        {/* 로그아웃 아이콘 */}
        <LogOut
          size={24}
          color="#FFFFFF"
          strokeWidth={2}
          onClick={handleLogout}
          style={{
            cursor: 'pointer',
            transition: 'opacity 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          title="로그아웃"
        />
      </div>
    </div>
  )
}

export default HeaderModule
