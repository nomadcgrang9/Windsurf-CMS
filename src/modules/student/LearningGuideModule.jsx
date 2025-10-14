import { useState, useEffect, useRef } from 'react'
import { getLearningGuide } from '../../services/learningGuideService'
import { parseStudentId } from '../../utils/formatUtils'
import FriendVoteModal from './FriendVoteModal'
import { getActiveVoteSession, hasStudentVoted, subscribeToVoteSessions } from '../../services/voteService'
import { supabase } from '../../services/supabaseClient'
import styles from './LearningGuideModule.module.css'

function LearningGuideModule() {
  const [content, setContent] = useState('학습안내를 불러오는 중...')
  const [additionalContent, setAdditionalContent] = useState('추가안내를 불러오는 중...')
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const contentRef = useRef(null)
  
  // 친구 투표 관련 상태
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [activeVoteSession, setActiveVoteSession] = useState(null)
  const [hasVoted, setHasVoted] = useState(false)
  
  // 활성 투표 세션 확인
  const checkActiveVoteSession = async () => {
    console.log('🗳️ [투표] checkActiveVoteSession 호출됨')
    try {
      const { data: session, error } = await getActiveVoteSession()
      console.log('🗳️ [투표] 세션 조회 결과:', session, error)
      if (error) throw error
      
      if (session) {
        console.log('🗳️ [투표] 활성 세션 발견:', session)
        setActiveVoteSession(session)
        
        // 학생의 투표 여부 확인
        const studentId = localStorage.getItem('studentId')
        if (studentId) {
          const { data: voted } = await hasStudentVoted(session.id, studentId)
          console.log('🗳️ [투표] 투표 여부:', voted)
          setHasVoted(voted || false)
        }
      } else {
        console.log('🗳️ [투표] 활성 세션 없음')
        setActiveVoteSession(null)
        setHasVoted(false)
      }
    } catch (error) {
      console.error('🗳️ [투표] 활성 투표 세션 확인 오류:', error)
    }
  }

  // 투표 세션 Realtime 구독
  useEffect(() => {
    console.log('🗳️ [투표] useEffect 실행됨')
    checkActiveVoteSession()
    
    const channel = subscribeToVoteSessions((payload) => {
      console.log('🗳️ [투표] 세션 변경:', payload)
      checkActiveVoteSession()
    })
    
    return () => {
      console.log('🗳️ [투표] 구독 해제')
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchLearningGuide = async () => {
    try {
      const studentId = localStorage.getItem('studentId')
      if (!studentId) {
        setError('로그인 정보를 찾을 수 없습니다.')
        return
      }
      const { grade, classNumber } = parseStudentId(studentId)
      const classInfo = `${grade}-${classNumber}`
      const guide = await getLearningGuide(classInfo)

      if (guide) {
        setContent(guide.content || '아직 학습안내가 등록되지 않았습니다.')
        setAdditionalContent(guide.additional_content || '추가안내가 아직 등록되지 않았습니다.')
        setError(null)
      } else {
        setContent('아직 학습안내가 등록되지 않았습니다.')
        setAdditionalContent('추가안내가 아직 등록되지 않았습니다.')
      }
    } catch (err) {
      console.error('학습안내 조회 오류:', err)
      setError('학습안내를 불러오는 중 오류가 발생했습니다.')
      setContent('학습안내를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLearningGuide()
    const intervalId = setInterval(fetchLearningGuide, 30000)
    return () => clearInterval(intervalId)
  }, [])

  // 스크롤 디버깅 및 강제 활성화
  useEffect(() => {
    const element = contentRef.current
    if (!element) return

    console.log('🔍 [스크롤 디버깅] 요소 정보:', {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      isScrollable: element.scrollHeight > element.clientHeight,
      overflowY: window.getComputedStyle(element).overflowY,
      touchAction: window.getComputedStyle(element).touchAction
    })

    // 휠 이벤트 리스너 (디버깅 + 강제 스크롤)
    const handleWheel = (e) => {
      console.log('🖱️ [휠 이벤트] deltaY:', e.deltaY)
      e.stopPropagation()
      element.scrollTop += e.deltaY
    }

    // 터치 이벤트 리스너 (디버깅)
    let touchStartY = 0
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY
      console.log('👆 [터치 시작] Y:', touchStartY)
    }

    const handleTouchMove = (e) => {
      const touchY = e.touches[0].clientY
      const deltaY = touchStartY - touchY
      console.log('👆 [터치 이동] deltaY:', deltaY)
      element.scrollTop += deltaY
      touchStartY = touchY
      e.preventDefault()
    }

    element.addEventListener('wheel', handleWheel, { passive: false })
    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      element.removeEventListener('wheel', handleWheel)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [loading])

  const handleCardClick = (e) => {
    if (e.target.tagName === 'A') {
      e.stopPropagation()
      return
    }
    // + 버튼 클릭 시 플립 방지
    if (e.target.closest('.vote-button')) {
      e.stopPropagation()
      return
    }
    setIsFlipped(!isFlipped)
  }
  
  // 투표 버튼 클릭
  const handleVoteButtonClick = (e) => {
    e.stopPropagation()
    
    console.log('🗳️ [투표] 버튼 클릭 - activeVoteSession:', activeVoteSession)
    console.log('🗳️ [투표] 버튼 클릭 - hasVoted:', hasVoted)
    
    // 투표 세션이 없거나 이미 투표한 경우
    if (!activeVoteSession) {
      console.log('🗳️ [투표] 세션 없음 - 알림 표시')
      alert('⚠️ 투표가 시작되지 않았습니다.\n\n선생님이 투표를 시작하시면 참여할 수 있습니다.')
      return
    }
    
    if (hasVoted) {
      console.log('🗳️ [투표] 이미 투표 완료')
      alert('✅ 이미 투표를 완료하셨습니다.')
      return
    }
    
    // 정상적으로 투표 모달 열기
    console.log('🗳️ [투표] 모달 열기')
    setShowVoteModal(true)
  }

  const renderContentWithLinks = (text) => {
    if (!text) return null
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ color: '#4A90E2', textDecoration: 'underline', wordBreak: 'break-all' }}
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  const contentStyle = {
    fontFamily: "'DaHyun', 'Pretendard', sans-serif",
    fontSize: '16px',
    color: error ? '#E74C3C' : '#666666',
    lineHeight: '1.8',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    paddingRight: '8px',
    // 터치 스크롤 및 휠 스크롤 활성화
    touchAction: 'pan-y',  // 터치 스크롤 명시적 허용
    WebkitOverflowScrolling: 'touch',  // Chrome/Safari 터치 스크롤 최적화
    overscrollBehavior: 'contain',  // 스크롤 경계 처리
    willChange: 'scroll-position'  // 스크롤 성능 최적화
  }

  const titleStyle = {
    fontFamily: "'DaHyun', 'Pretendard', sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    color: '#333333',
    marginBottom: '16px',
    flexShrink: 0
  }

  // 투표 버튼 항상 표시 (상태에 따라 다른 동작)
  const showVoteButton = true
  
  return (
    <>
      <div 
        className={`module-card ${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
        onClick={handleCardClick}
        style={{ cursor: 'pointer', padding: 0 }}
      >
        {/* 앞면 - 학습안내 */}
        <div className={styles.cardFront}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ ...titleStyle, marginBottom: 0 }}>학습안내</h3>
            {/* 투표 버튼 - 항상 표시, 상태에 따라 다른 스타일 */}
            {hasVoted && activeVoteSession ? (
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#A8E6CF',
                  flexShrink: 0
                }}
              >
                ✓
              </div>
            ) : (
              <button
                className="vote-button"
                onClick={handleVoteButtonClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#B8D4D9'
                }}
              >
                +
              </button>
            )}
          </div>
        <div ref={contentRef} style={contentStyle}>
          {loading ? <div style={{ textAlign: 'center', color: '#999' }}>불러오는 중...</div> : renderContentWithLinks(content)}
        </div>
      </div>

      {/* 뒷면 - 추가안내 */}
      <div className={styles.cardBack}>
        <h3 style={titleStyle}>추가안내</h3>
        <div ref={contentRef} style={contentStyle}>
          {loading ? <div style={{ textAlign: 'center', color: '#999' }}>불러오는 중...</div> : renderContentWithLinks(additionalContent)}
        </div>
      </div>
    </div>
    
    {/* 친구 투표 모달 */}
    {showVoteModal && (
      <FriendVoteModal
        session={activeVoteSession}
        onClose={() => setShowVoteModal(false)}
        onVoteComplete={() => {
          setHasVoted(true)
          setShowVoteModal(false)
        }}
      />
    )}
    </>
  )
}

export default LearningGuideModule
