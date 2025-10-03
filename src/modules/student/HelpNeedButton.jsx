import { useState, useEffect } from 'react'
import { createHelpRequest, cancelHelpRequest, getMyActiveRequest } from '../../services/helpService'
import { supabase } from '../../services/supabaseClient'

/**
 * 도와줄래? 버튼
 * - Column 3 (21%, 하단 25%)
 * - 도움 요청 버튼
 * - - 버튼으로 취소 가능
 */
function HelpNeedButton() {
  const [myStatus, setMyStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  // 내 상태 확인
  const checkMyStatus = async () => {
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) return

      const request = await getMyActiveRequest(studentId)
      setMyStatus(request?.status || null)
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
      .channel('help_status_sync')
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

  // 도와줄래? 토글 (클릭할 때마다 활성화/취소)
  const handleClick = async () => {
    if (loading) return
    
    const studentId = localStorage.getItem('studentId')
    if (!studentId) {
      alert('로그인 정보를 찾을 수 없습니다.')
      return
    }

    setLoading(true)
    try {
      if (myStatus === 'requesting') {
        // 이미 활성화 → 취소
        await cancelHelpRequest(studentId)
        setMyStatus(null)
      } else if (myStatus === null) {
        // 중립 상태 → 활성화
        await createHelpRequest(studentId, 'requesting')
        setMyStatus('requesting')
      } else {
        // 다른 상태(helping) → 경고
        alert('이미 다른 상태가 활성화되어 있습니다.')
      }
    } catch (error) {
      console.error('도움 요청 오류:', error)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="help-need-button">
      <button
        className="help-system-button"
        onClick={handleClick}
        disabled={loading || (myStatus !== null && myStatus !== 'requesting')}
        style={{
          opacity: myStatus !== null && myStatus !== 'requesting' ? 0.5 : 1,
          cursor: loading ? 'wait' : (myStatus !== null && myStatus !== 'requesting' ? 'not-allowed' : 'pointer')
        }}
      >
        <img src="/characters/q-help.png" alt="도와줄래?" className="help-icon" />
        <div style={{ marginTop: '8px' }}>
          도와줄래?
        </div>
      </button>
    </div>
  )
}

export default HelpNeedButton
