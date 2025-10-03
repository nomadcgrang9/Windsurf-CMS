import { useRef, useEffect, useState } from 'react'
import styles from './TimerModule.module.css'

/**
 * 타이머 모듈 - 플립카드
 * - 좌측 도구 1번
 * - 기존 tool-button 구조 유지 + 플립 기능 추가
 * - 앞면: 기존 아이콘 이미지 + 텍스트
 * - 뒷면: 타이머 기능 (초 입력 → 카운트다운 → 알람)
 * - 카드 플립 시에도 타이머 유지 (전역 상태 사용)
 * - 알람 소리 반복 재생 (확인 버튼 클릭 시 중지)
 */
function TimerModule({ isFlipped, onFlip, state, setState }) {
  const [inputSeconds, setInputSeconds] = useState('')
  const [showAlarm, setShowAlarm] = useState(false)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  // 타이머 카운트다운
  useEffect(() => {
    if (state.isRunning && state.seconds > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          seconds: prev.seconds - 1
        }))
      }, 1000)
    } else if (state.seconds === 0 && state.isRunning) {
      // 타이머 종료
      setState(prev => ({ ...prev, isRunning: false }))
      setShowAlarm(true)
      
      // 알람 소리 생성 (뚱땅뚱땅 패턴)
      const context = new (window.AudioContext || window.webkitAudioContext)()
      
      const playPattern = () => {
        // 뚱 (낮은음)
        const osc1 = context.createOscillator()
        const gain1 = context.createGain()
        osc1.connect(gain1)
        gain1.connect(context.destination)
        osc1.frequency.value = 400
        osc1.type = 'sine'
        gain1.gain.setValueAtTime(0.3, context.currentTime)
        gain1.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15)
        osc1.start(context.currentTime)
        osc1.stop(context.currentTime + 0.15)
        
        // 땅 (높은음)
        const osc2 = context.createOscillator()
        const gain2 = context.createGain()
        osc2.connect(gain2)
        gain2.connect(context.destination)
        osc2.frequency.value = 600
        osc2.type = 'sine'
        gain2.gain.setValueAtTime(0.3, context.currentTime + 0.2)
        gain2.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.35)
        osc2.start(context.currentTime + 0.2)
        osc2.stop(context.currentTime + 0.35)
      }
      
      // 패턴 반복 (1초마다)
      playPattern()
      const intervalId = setInterval(playPattern, 1000)
      
      audioRef.current = { context, intervalId }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [state.isRunning, state.seconds, setState])

  const handleStart = (e) => {
    e.stopPropagation()
    const seconds = parseInt(inputSeconds)
    if (seconds > 0) {
      setState({ seconds, isRunning: true })
      setInputSeconds('')
    }
  }

  const handleStop = (e) => {
    e.stopPropagation()
    setState(prev => ({ ...prev, isRunning: false }))
  }

  const handleReset = (e) => {
    e.stopPropagation()
    setState({ seconds: 0, isRunning: false })
    setInputSeconds('')
  }

  const handleCardClick = (e) => {
    // 뒷면의 버튼/입력 클릭 시에는 플립하지 않음
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
      e.stopPropagation()
      return
    }
    onFlip()
  }

  const handleAlarmClose = (e) => {
    e.stopPropagation()
    setShowAlarm(false)
    
    // 알람 소리 중지
    if (audioRef.current) {
      clearInterval(audioRef.current.intervalId)
      audioRef.current.context.close()
      audioRef.current = null
    }
  }

  return (
    <>
      <div 
        className={`tool-button ${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
        onClick={handleCardClick}
      >
        {/* 앞면 - 기존 구조 유지 */}
        <div className={styles.cardFront}>
          <div className="tool-button-icon">
            <img src="/characters/timer.png" alt="타이머" className="tool-icon" />
          </div>
          <div className="tool-button-text">타이머</div>
        </div>

        {/* 뒷면 - 타이머 기능 */}
        <div className={styles.cardBack}>
          <div className={styles.backContent}>
            <div className={styles.title}>타이머</div>
            
            {!state.isRunning && state.seconds === 0 ? (
              <>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={styles.input}
                  placeholder=""
                  value={inputSeconds}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setInputSeconds(value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button 
                  className={styles.button}
                  onClick={handleStart}
                  disabled={!inputSeconds || parseInt(inputSeconds) <= 0}
                >
                  시작
                </button>
              </>
            ) : (
              <>
                <div className={styles.display}>{state.seconds}초</div>
                <div className={styles.buttonGroup}>
                  {state.isRunning ? (
                    <button className={styles.button} onClick={handleStop}>정지</button>
                  ) : (
                    <button className={styles.button} onClick={(e) => {
                      e.stopPropagation()
                      setState(prev => ({ ...prev, isRunning: true }))
                    }}>재개</button>
                  )}
                  <button className={styles.buttonSecondary} onClick={handleReset}>리셋</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 알람 모달 */}
      {showAlarm && (
        <div className={styles.modal} onClick={handleAlarmClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>타이머 종료</div>
            <div className={styles.modalMessage}>설정한 시간이 끝났습니다</div>
            <button className={styles.modalButton} onClick={handleAlarmClose}>확인</button>
          </div>
        </div>
      )}
    </>
  )
}

export default TimerModule
