import { useState, useEffect } from 'react'
import { getDailyPoints, incrementPoints } from '../../services/pointService'
import { supabase } from '../../services/supabaseClient'

/**
 * 오늘의 포인트 모듈
 * - Column 2 하단 (40%)
 * - 포인트 게이지바 표시
 * - 실시간 업데이트 (Supabase Realtime)
 */
function DailyPointsModule() {
  const [currentPoints, setCurrentPoints] = useState(0)
  const [maxPoints, setMaxPoints] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [adding, setAdding] = useState(false)

  const percentage = (currentPoints / maxPoints) * 100

  // 포인트 조회 함수
  const fetchPoints = async () => {
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) {
        setError('로그인 정보를 찾을 수 없습니다.')
        return
      }

      const points = await getDailyPoints(studentId)
      
      if (points) {
        setCurrentPoints(points.current_points)
        setMaxPoints(points.max_points)
        setError(null)
      }
    } catch (err) {
      console.error('포인트 조회 오류:', err)
      setError('포인트를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 & Realtime 구독
  useEffect(() => {
    fetchPoints() // 즉시 실행

    const studentId = localStorage.getItem('studentId')
    if (!studentId) return

    // Realtime 구독 (포인트 변경 시 자동 업데이트)
    const channel = supabase
      .channel('daily_points_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_points',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          console.log('포인트 변경 감지:', payload)
          if (payload.new) {
            setCurrentPoints(payload.new.current_points)
            setMaxPoints(payload.new.max_points)
          }
        }
      )
      .subscribe()

    // cleanup: 컴포넌트 언마운트 시 구독 해제
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 20개 도달 여부
  const isMaxReached = currentPoints >= maxPoints

  // + 버튼 클릭 핸들러
  const handlePlusClick = () => {
    if (isMaxReached) {
      alert('오늘의 포인트 한도에 도달했습니다!')
      return
    }
    setShowModal(true)
  }

  // 확인 버튼 핸들러
  const handleConfirm = async () => {
    setAdding(true)
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) {
        alert('로그인 정보를 찾을 수 없습니다.')
        return
      }

      await incrementPoints(studentId, 1)
      setShowModal(false)
    } catch (error) {
      console.error('포인트 추가 오류:', error)
      alert('포인트 추가 중 오류가 발생했습니다.')
    } finally {
      setAdding(false)
    }
  }

  // 취소 버튼 핸들러
  const handleCancel = () => {
    setShowModal(false)
  }

  return (
    <>
      <div className="module-card" style={{ cursor: 'default', position: 'relative' }}>
        {/* + 버튼 (우측 상단) */}
        {!loading && !error && (
          <button
            onClick={handlePlusClick}
            disabled={isMaxReached}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              fontWeight: 700,
              color: isMaxReached ? '#ccc' : '#B8D4D9',
              cursor: isMaxReached ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
            onMouseEnter={(e) => {
              if (!isMaxReached) {
                e.target.style.transform = 'scale(1.2)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
            }}
          >
            +
          </button>
        )}

        <h3 style={{
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          fontSize: '28px',
          fontWeight: 700,
          color: '#333333',
          marginBottom: '16px'
        }}>
          오늘의 포인트
        </h3>
      
      {loading ? (
        <div style={{
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          fontSize: '16px',
          color: '#999',
          textAlign: 'center'
        }}>
          불러오는 중...
        </div>
      ) : error ? (
        <div style={{
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          fontSize: '14px',
          color: '#E74C3C',
          textAlign: 'center'
        }}>
          {error}
        </div>
      ) : (
        <>
          {/* 포인트 숫자 */}
          <div style={{
            fontFamily: "'DaHyun', 'Pretendard', sans-serif",
            fontSize: '36px',
            fontWeight: 900,
            color: isMaxReached ? '#E74C3C' : '#7BA8B0',
            marginBottom: '16px',
            transition: 'color 0.3s ease'
          }}>
            {currentPoints} / {maxPoints}
          </div>

          {/* 게이지바 */}
          <div style={{
            width: '100%',
            height: '24px',
            background: 'rgba(184, 212, 217, 0.15)',
            borderRadius: '12px',
            overflow: 'hidden',
            border: isMaxReached ? '2px solid #E74C3C' : 'none'
          }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: isMaxReached ? '#E74C3C' : '#B8D4D9',
              transition: 'width 0.5s ease, background 0.3s ease'
            }} />
          </div>

          {/* 20개 도달 메시지 */}
          {isMaxReached && (
            <div style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '14px',
              color: '#E74C3C',
              marginTop: '8px',
              textAlign: 'center',
              fontWeight: 600
            }}>
              오늘의 한도에 도달했습니다!
            </div>
          )}
        </>
      )}
      </div>

      {/* 경고 모달 */}
      {showModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            textAlign: 'center'
          }}>
            {/* 경고 아이콘 */}
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              ⚠️
            </div>

            {/* 제목 */}
            <h3 style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '16px'
            }}>
              포인트 추가 확인
            </h3>

            {/* 메시지 */}
            <p style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              포인트 추가는 선생님께서<br />
              미리 허락하신 경우만 가능합니다.
            </p>

            {/* 버튼 */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancel}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  color: '#666',
                  background: 'white',
                  border: '2px solid #E0E0E0',
                  borderRadius: '8px',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!adding) {
                    e.target.style.background = '#F5F5F5'
                    e.target.style.borderColor = '#999'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white'
                  e.target.style.borderColor = '#E0E0E0'
                }}
              >
                취소
              </button>

              <button
                onClick={handleConfirm}
                disabled={adding}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  color: 'white',
                  background: adding ? '#ccc' : '#B8D4D9',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: adding ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!adding) e.target.style.background = '#A0C4CC'
                }}
                onMouseLeave={(e) => {
                  if (!adding) e.target.style.background = '#B8D4D9'
                }}
              >
                {adding ? '추가 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DailyPointsModule
