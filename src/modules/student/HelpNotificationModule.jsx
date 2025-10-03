import { useState, useEffect } from 'react'
import { getActiveHelpRequests } from '../../services/helpService'
import { parseStudentId } from '../../utils/formatUtils'
import { supabase } from '../../services/supabaseClient'

/**
 * 도움알림 모듈
 * - Column 3-5 병합 (63%, 상단 75%)
 * - 학급 접속 학생 목록 표시
 * - 상태별 표시: 주황(도와줄래), 하늘(도와줄게), 회색(일반)
 * - Realtime 구독으로 즉시 업데이트
 */
function HelpNotificationModule() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  // 도움 상태 조회
  const fetchHelpStatus = async () => {
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) return

      const { grade, classNumber } = parseStudentId(studentId)
      const classInfo = `${grade}-${classNumber}`

      const data = await getActiveHelpRequests(classInfo)
      setStudents(data)
    } catch (error) {
      console.error('도움 상태 조회 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 & Realtime 구독
  useEffect(() => {
    fetchHelpStatus()

    // Realtime 구독
    const channel = supabase
      .channel('help_requests_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests'
        },
        () => {
          fetchHelpStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 임시 데이터 (백업용) - 실제로는 위의 students 사용
  const tempStudents = [
    { id: '3101', name: '고유원', status: 'normal' },
    { id: '3102', name: '김지성', status: 'need_help' },
    { id: '3103', name: '신유나', status: 'normal' },
    { id: '3104', name: '염로하', status: 'helping' },
    { id: '3105', name: '우리아', status: 'normal' },
    { id: '3106', name: '이은율', status: 'normal' },
    { id: '3107', name: '이채아', status: 'normal' },
    { id: '3108', name: '정서윤', status: 'need_help' },
    { id: '3109', name: '정세영', status: 'normal' },
    { id: '3110', name: '금준', status: 'normal' },
    { id: '3111', name: '김윤', status: 'normal' },
    { id: '3112', name: '김재민', status: 'normal' },
    { id: '3113', name: '김지율', status: 'helping' },
    { id: '3114', name: '노승원', status: 'normal' },
    { id: '3115', name: '배민규', status: 'normal' },
    { id: '3116', name: '엄제오', status: 'normal' },
    { id: '3117', name: '염로건', status: 'normal' },
    { id: '3118', name: '이진일', status: 'need_help' },
    { id: '3119', name: '정서준', status: 'normal' },
    { id: '3120', name: '최동하', status: 'normal' },
    { id: '3121', name: '하지우', status: 'normal' },
    { id: '3201', name: '강민하', status: 'normal' },
    { id: '3202', name: '강세라', status: 'normal' },
    { id: '3203', name: '엄시월', status: 'normal' },
    { id: '3204', name: '은준송', status: 'helping' },
    { id: '3205', name: '이봄', status: 'normal' },
    { id: '3206', name: '이지민', status: 'normal' },
    { id: '3207', name: '정서윤', status: 'normal' },
    { id: '3208', name: '김시훈', status: 'normal' },
    { id: '3209', name: '김윤우', status: 'normal' },
  ]

  const getStatusColor = (status, isActive) => {
    if (!isActive) return '#E8E8E8' // 회색 (일반)
    
    switch (status) {
      case 'requesting': return '#FFB380' // 주황 (도와줄래)
      case 'helping': return '#A8D8F0'    // 하늘색 (도와줄게)
      default: return '#E8E8E8'           // 회색
    }
  }

  const getStatusIcon = (status, isActive) => {
    const color = getStatusColor(status, isActive)
    return (
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: color,
        border: !isActive ? '1.5px solid #D0D0D0' : 'none'
      }} />
    )
  }

  return (
    <div className="help-notification-module">
      <h2 style={{
        fontFamily: "'DaHyun', 'Pretendard', sans-serif",
        fontSize: '28px',
        fontWeight: 700,
        color: '#333333',
        marginBottom: '16px',
        textAlign: 'center'
      }}>
        도움알림
      </h2>

      {/* 학생 그리드 */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#999',
          fontFamily: "'DaHyun', 'Pretendard', sans-serif"
        }}>
          불러오는 중...
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '6px'
        }}>
          {students.map((student) => (
            <div
              key={student.student_id}
              style={{
                background: '#FFFFFF',
                border: `2px solid ${getStatusColor(student.status, student.is_active)}`,
                borderRadius: '6px',
                padding: '6px 2px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                minHeight: '50px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div style={{ marginBottom: '3px' }}>
                {getStatusIcon(student.status, student.is_active)}
              </div>
              <div style={{
                fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                fontSize: '12px',
                fontWeight: 600,
                color: '#333333',
                lineHeight: '1.2'
              }}>
                {student.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default HelpNotificationModule
