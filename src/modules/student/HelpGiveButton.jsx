import { useState, useEffect } from 'react'
import { createHelpRequest, cancelHelpRequest, getMyActiveRequest, getTodayThanksCount } from '../../services/helpService'
import { supabase } from '../../services/supabaseClient'

/**
 * 도와줄게! 버튼
 * - Column 4 (21%, 하단 25%)
 * - 도움 제공 버튼
 * - - 버튼으로 취소 가능
 */
function HelpGiveButton() {
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [todayThanksCount, setTodayThanksCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  
  const MAX_DAILY_HELPS = 3

  // 내 상태 확인
  const checkMyStatus = async () => {
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) return

      const request = await getMyActiveRequest(studentId)
      setMyStatus(request?.status || null)
      
      // 오늘 고마워 받은 횟수 조회
      const count = await getTodayThanksCount(studentId)
      setTodayThanksCount(count)
    } catch (error) {
      console.error('상태 확인 오류:', error)
    }
  }

  useEffect(() => {
    checkMyStatus()

    // Realtime 구독으로 상태 동기화
    const studentId = localStorage.getItem('studentId')
    if (!studentId) return

    const channel = supabase
      .channel('help_status_sync_give')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests',
          filter: `student_id=eq.${studentId}`
        },
        () => {
          checkMyStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 도와줄게! 토글 (클릭할 때마다 활성화/취소)
  const handleClick = async () => {
    if (loading) return
    
    const studentId = localStorage.getItem('studentId')
    if (!studentId) {
      alert('로그인 정보를 찾을 수 없습니다.')
      return
    }

    // 3회 제한 체크
    if (todayThanksCount >= MAX_DAILY_HELPS && myStatus !== 'helping') {
      setShowLimitModal(true)
      return
    }

    setLoading(true)
    try {
      if (myStatus === 'helping') {
        // 이미 활성화 → 취소
        await cancelHelpRequest(studentId)
        setMyStatus(null)
      } else if (myStatus === null) {
        // 중립 상태 → 활성화
        await createHelpRequest(studentId, 'helping')
        setMyStatus('helping')
      } else {
        // 다른 상태(requesting) → 경고
        alert('이미 다른 상태가 활성화되어 있습니다.')
      }
    } catch (error) {
      console.error('도와줄게 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = loading || (myStatus !== null && myStatus !== 'helping') || todayThanksCount >= MAX_DAILY_HELPS

  return (
    <>
      <div className="help-give-button">
        <button
          className="help-system-button"
          onClick={handleClick}
          disabled={isDisabled}
          style={{
            opacity: isDisabled ? 0.5 : 1,
            cursor: loading ? 'wait' : (isDisabled ? 'not-allowed' : 'pointer')
          }}
        >
          <img src="/characters/a-help.png" alt="도와줄게!" className="help-icon" />
          <div style={{ marginTop: '8px' }}>
            {todayThanksCount >= MAX_DAILY_HELPS ? '오늘 한도 달성 ✓' : '도와줄게!'}
          </div>
          {todayThanksCount > 0 && todayThanksCount < MAX_DAILY_HELPS && (
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {todayThanksCount}/{MAX_DAILY_HELPS}회
            </div>
          )}
        </button>
      </div>

      {/* 한도 달성 모달 */}
      {showLimitModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>✓</div>
            <h3 style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '24px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '16px'
            }}>
              오늘의 도와주기 완료!
            </h3>
            <p style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              오늘의 도와주기 한도를 3회 충족했습니다.<br />
              내일 다시 친구들을 도와주세요! 😊
            </p>
            <button
              onClick={() => setShowLimitModal(false)}
              style={{
                fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'white',
                background: '#B8D4D9',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#A0C4C9'}
              onMouseLeave={(e) => e.target.style.background = '#B8D4D9'}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default HelpGiveButton
