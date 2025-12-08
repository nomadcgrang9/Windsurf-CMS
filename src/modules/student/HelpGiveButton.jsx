import { useState, useEffect } from 'react'
import { createHelpRequest, cancelHelpRequest, getMyActiveRequest, getTodayThanksCount, checkHelpCooldown } from '../../services/helpService'
import { supabase } from '../../services/supabaseClient'
import { getHelpSettingsByStudentId, DEFAULT_SETTINGS } from '../../services/helpSettingsService'

/**
 * 도와줄게! 버튼
 * - Column 4 (21%, 하단 25%)
 * - 도움 제공 버튼
 * - - 버튼으로 취소 가능
 * - 🎯 일일 제한 횟수는 help_settings 테이블에서 조회
 */
function HelpGiveButton() {
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [todayThanksCount, setTodayThanksCount] = useState(0)
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [isInCooldown, setIsInCooldown] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // 🎯 하드코딩 제거: DB에서 조회한 일일 제한 값 사용
  const [dailyLimit, setDailyLimit] = useState(DEFAULT_SETTINGS.daily_limit)

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

      // 🎯 쿨타임 확인
      const cooldown = await checkHelpCooldown(studentId)
      console.log('🎯 [HelpGiveButton] 쿨타임 상태:', cooldown)
      setIsInCooldown(cooldown.isInCooldown)
      setRemainingSeconds(cooldown.remainingSeconds)

      // 🎯 일일 제한 설정 조회 (DB에서)
      const settings = await getHelpSettingsByStudentId(studentId)
      console.log('🎯 [HelpGiveButton] 도움 설정:', settings)
      setDailyLimit(settings?.daily_limit ?? DEFAULT_SETTINGS.daily_limit)
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

  // 🎯 쿨타임 카운트다운
  useEffect(() => {
    if (!isInCooldown || remainingSeconds <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          setIsInCooldown(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isInCooldown, remainingSeconds])

  // 도와줄게! 토글 (클릭할 때마다 활성화/취소)
  const handleClick = async () => {
    if (loading) return
    
    const studentId = localStorage.getItem('studentId')
    if (!studentId) {
      alert('로그인 정보를 찾을 수 없습니다.')
      return
    }

    // 🎯 쿨타임 체크
    if (isInCooldown) {
      alert(`도와줄게로 포인트를 받으면 10분간은 도와줄게를 누를 수 없습니다.\n남은 시간: ${remainingSeconds}초`)
      return
    }

    // 일일 제한 체크 (DB에서 조회한 dailyLimit 사용)
    if (todayThanksCount >= dailyLimit && myStatus !== 'helping') {
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

  const isDisabled = loading || (myStatus !== null && myStatus !== 'helping') || todayThanksCount >= dailyLimit || isInCooldown

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
            {isInCooldown ? '쉬는중' : (todayThanksCount >= dailyLimit ? '도움완료' : '도와줄게!')}
          </div>
          {isInCooldown ? (
            <div style={{ fontSize: '11px', color: '#ff6b6b', marginTop: '4px' }}>
              {remainingSeconds}초 후
            </div>
          ) : todayThanksCount > 0 && todayThanksCount < dailyLimit && (
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              {todayThanksCount}/{dailyLimit}회
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
              오늘의 도와주기 한도를 {dailyLimit}회 충족했습니다.<br />
              내일 다시 친구들을 도와주세요!
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
