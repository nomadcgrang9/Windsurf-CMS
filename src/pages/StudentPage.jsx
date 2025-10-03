import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import HeaderModule from '../modules/student/HeaderModule'
import TimerModule from '../modules/student/TimerModule'
import RoleAssignModule from '../modules/student/RoleAssignModule'
import MessageBoxModule from '../modules/student/MessageBoxModule'
import RandomPickModule from '../modules/student/RandomPickModule'
import LearningGuideModule from '../modules/student/LearningGuideModule'
import DailyPointsModule from '../modules/student/DailyPointsModule'
import HelpNotificationModule from '../modules/student/HelpNotificationModule'
import HelpNeedButton from '../modules/student/HelpNeedButton'
import HelpGiveButton from '../modules/student/HelpGiveButton'
import HelpThanksButton from '../modules/student/HelpThanksButton'
import '../styles/student-main.css'

/**
 * 학생 메인 페이지
 * - 로그인 후 접근 가능
 * - 5열 그리드 레이아웃
 * - 모듈 조합만 담당 (절대규칙 1)
 * - 플립카드 상태 중앙 관리 (전역 오염 방지)
 */
function StudentPage() {
  const navigate = useNavigate()

  // 플립카드 상태 (null, 'timer', 'role', 'message', 'random')
  const [flippedCard, setFlippedCard] = useState(null)

  // 타이머 상태 (카드 플립 시에도 유지)
  const [timerState, setTimerState] = useState({
    seconds: 0,
    isRunning: false
  })

  // 뽑기 상태
  const [randomPickState, setRandomPickState] = useState({
    lists: [],
    selectedList: null,
    result: null
  })

  // 역할 상태
  const [roleState, setRoleState] = useState({
    myRole: null,
    lastUpdated: null
  })

  // 쪽지 상태
  const [messageState, setMessageState] = useState({
    messages: [],
    unreadCount: 0
  })

  // 로그인 확인
  useEffect(() => {
    const studentId = localStorage.getItem('studentId')
    const studentName = localStorage.getItem('studentName')
    
    if (!studentId || !studentName) {
      // 로그인 안 되어 있으면 로그인 페이지로
      navigate('/student/login')
    }
  }, [navigate])

  return (
    <div className="student-main-container">
      {/* 헤더 - 전체 너비 */}
      <HeaderModule />

      {/* Column 1 - 좌측 도구 (12%) */}
      <div className="tools-column">
        <TimerModule
          isFlipped={flippedCard === 'timer'}
          onFlip={() => setFlippedCard(flippedCard === 'timer' ? null : 'timer')}
          state={timerState}
          setState={setTimerState}
        />
        <RoleAssignModule
          isFlipped={flippedCard === 'role'}
          onFlip={() => setFlippedCard(flippedCard === 'role' ? null : 'role')}
          state={roleState}
          setState={setRoleState}
        />
        <MessageBoxModule
          isFlipped={flippedCard === 'message'}
          onFlip={() => setFlippedCard(flippedCard === 'message' ? null : 'message')}
          state={messageState}
          setState={setMessageState}
        />
        <RandomPickModule
          isFlipped={flippedCard === 'random'}
          onFlip={() => setFlippedCard(flippedCard === 'random' ? null : 'random')}
          state={randomPickState}
          setState={setRandomPickState}
        />
      </div>
      {/* Column 2 - 학습안내/포인트 (18%) */}
      <div className="info-column">
        <LearningGuideModule />
        <DailyPointsModule />
      </div>

      {/* Column 3-5 - 도움알림 (70%, 상단) */}
      <HelpNotificationModule />

      {/* Column 3 - 도와줄래? (23%, 하단) */}
      <HelpNeedButton />

      {/* Column 4 - 도와줄게! (23%, 하단) */}
      <HelpGiveButton />

      {/* Column 5 - 고마워 (24%, 하단) */}
      <HelpThanksButton />
    </div>
  )
}

export default StudentPage
