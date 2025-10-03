import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLearningGuideTab from '../modules/admin/AdminLearningGuideTab'
import AdminPointsTab from '../modules/admin/AdminPointsTab'
import AdminClassTab from '../modules/admin/AdminClassTab'
import AdminRoleTab from '../modules/admin/AdminRoleTab'
import AdminHelpTab from '../modules/admin/AdminHelpTab'
import AdminHoverMessageTab from '../modules/admin/AdminHoverMessageTab'
import AdminMessageTab from '../modules/admin/AdminMessageTab'
import AdminRandomPickTab from '../modules/admin/AdminRandomPickTab'

/**
 * 관리자 메인 페이지
 * - 로그인 후 접근 가능
 * - 8개 탭 구조 (2줄 레이아웃)
 * - 탭 전환으로 기능 선택
 */
function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('learning') // learning, points, class, role, help, hover, message, pick

  // 로그인 확인
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin')
    
    if (!isAdmin) {
      // 로그인 안 되어 있으면 로그인 페이지로
      navigate('/admin/login')
    }
  }, [navigate])

  // 로그아웃
  const handleLogout = () => {
    localStorage.removeItem('isAdmin')
    navigate('/admin/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      fontFamily: "'Pretendard', sans-serif"
    }}>
      {/* 헤더 */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '2px solid #E0E0E0',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#333',
          margin: 0
        }}>
          관리자 페이지
        </h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#666',
            background: 'white',
            border: '2px solid #E0E0E0',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = '#999'
            e.target.style.color = '#333'
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = '#E0E0E0'
            e.target.style.color = '#666'
          }}
        >
          로그아웃
        </button>
      </div>

      {/* 탭 버튼 (2줄 레이아웃) */}
      <div style={{
        background: '#F5F5F5',
        padding: '0 40px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        borderBottom: '1px solid #E0E0E0'
      }}>
        <button
          onClick={() => setActiveTab('learning')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'learning' ? '#333' : '#999',
            background: activeTab === 'learning' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'learning' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          학습안내 입력
        </button>
        <button
          onClick={() => setActiveTab('points')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'points' ? '#333' : '#999',
            background: activeTab === 'points' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'points' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          포인트 관리
        </button>
        <button
          onClick={() => setActiveTab('class')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'class' ? '#333' : '#999',
            background: activeTab === 'class' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'class' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          학급 관리
        </button>
        <button
          onClick={() => setActiveTab('role')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'role' ? '#333' : '#999',
            background: activeTab === 'role' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'role' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          역할배정
        </button>
        <button
          onClick={() => setActiveTab('help')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'help' ? '#333' : '#999',
            background: activeTab === 'help' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'help' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          도움관리
        </button>
        <button
          onClick={() => setActiveTab('hover')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'hover' ? '#333' : '#999',
            background: activeTab === 'hover' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'hover' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          말풍선 관리
        </button>
        <button
          onClick={() => setActiveTab('message')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'message' ? '#333' : '#999',
            background: activeTab === 'message' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'message' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          쪽지 관리
        </button>
        <button
          onClick={() => setActiveTab('pick')}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: 600,
            color: activeTab === 'pick' ? '#333' : '#999',
            background: activeTab === 'pick' ? '#FFFFFF' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pick' ? '3px solid #667eea' : '3px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          뽑기 관리
        </button>
      </div>

      {/* 탭 내용 */}
      <div style={{
        padding: '40px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {activeTab === 'learning' && <AdminLearningGuideTab />}
        
        {activeTab === 'points' && <AdminPointsTab />}
        
        {activeTab === 'class' && <AdminClassTab />}
        
        {activeTab === 'role' && <AdminRoleTab />}
        
        {activeTab === 'help' && <AdminHelpTab />}
        
        {activeTab === 'hover' && <AdminHoverMessageTab />}
        
        {activeTab === 'message' && <AdminMessageTab />}
        
        {activeTab === 'pick' && <AdminRandomPickTab />}
      </div>
    </div>
  )
}

export default AdminPage
