import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import StudentLoginPage from './pages/StudentLoginPage'
import StudentLoginTestPage from './pages/StudentLoginTestPage'
import StudentPage from './pages/StudentPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'
import TestLearningGuidePage from './pages/TestLearningGuidePage'
import TestPointsPage from './pages/TestPointsPage'

/**
 * 메인 앱 컴포넌트
 * - 라우팅 설정 및 페이지 전환 관리
 * - 학생 로그인 → 학생 페이지
 * - 관리자 로그인 → 관리자 페이지
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* 기본 경로: 학생 로그인으로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/student/login" replace />} />
        
        {/* 학생 로그인 페이지 */}
        <Route path="/student/login" element={<StudentLoginPage />} />
        
        {/* 학생 로그인 테스트 페이지 */}
        <Route path="/student/login/test" element={<StudentLoginTestPage />} />
        
        {/* 학생 메인 페이지 */}
        <Route path="/student" element={<StudentPage />} />
        
        {/* 관리자 로그인 페이지 */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        
        {/* 관리자 메인 페이지 */}
        <Route path="/admin" element={<AdminPage />} />
        
        {/* 학습안내 테스트 페이지 */}
        <Route path="/test/learning-guide" element={<TestLearningGuidePage />} />
        
        {/* 포인트 테스트 페이지 */}
        <Route path="/test/points" element={<TestPointsPage />} />
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
