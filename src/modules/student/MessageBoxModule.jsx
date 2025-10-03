import { useState, useEffect } from 'react'
import styles from './MessageBoxModule.module.css'
import { getLatestUnreadMessage, markAsRead, sendReplyToTeacher, subscribeToMyMessages } from '../../services/messageService.js'

/**
 * 쪽지함 모듈 - 플립카드
 * - 좌측 도구 3번
 * - 기존 tool-button 구조 유지 + 플립 기능 추가
 * - 앞면: 기존 아이콘 이미지 + 텍스트 + 배지
 * - 뒷면: 최근 안읽은 쪽지 1개 전문 표시
 */
function MessageBoxModule({ isFlipped, onFlip, state, setState }) {
  const [message, setMessage] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [loading, setLoading] = useState(false)

  const studentId = localStorage.getItem('studentId')
  // 최근 쪽지 조회
  const fetchLatestMessage = async () => {
    try {
      const data = await getLatestUnreadMessage(studentId)
      setMessage(data)
      setState({ ...state, unreadCount: data ? 1 : 0 })
    } catch (error) {
      console.error('쪽지 조회 실패:', error)
    }
  }

  // 초기 로딩 및 Realtime 구독
  useEffect(() => {
    if (!studentId) return

    fetchLatestMessage()

    const channel = subscribeToMyMessages(studentId, (newMessage) => {
      setMessage(newMessage)
      setState(prev => ({ ...prev, unreadCount: 1 }))
    })

    return () => {
      channel.unsubscribe()
    }
  }, [studentId])

  const handleCardClick = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      e.stopPropagation()
      return
    }
    onFlip()
  }

  // 확인 버튼 (읽음 처리)
  const handleConfirm = async () => {
    if (!message) return
    try {
      await markAsRead(message.message_id)
      setMessage(null)
      setState({ ...state, unreadCount: 0 })
      setShowDetailModal(false)
    } catch (error) {
      console.error('읽음 처리 실패:', error)
      alert('읽음 처리에 실패했습니다.')
    }
  }

  // 답장 버튼
  const handleReplyClick = () => {
    setShowDetailModal(false)
    setShowReplyModal(true)
  }

  // 답장 보내기
  const handleSendReply = async () => {
    if (!replyContent.trim()) {
      alert('답장 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      await sendReplyToTeacher(studentId, replyContent)
      await markAsRead(message.message_id)
      setMessage(null)
      setState({ ...state, unreadCount: 0 })
      setReplyContent('')
      setShowReplyModal(false)
      alert('답장이 전송되었습니다.')
    } catch (error) {
      console.error('답장 전송 실패:', error)
      alert('답장 전송에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 답장 취소 (읽음 처리)
  const handleCancelReply = async () => {
    try {
      await markAsRead(message.message_id)
      setMessage(null)
      setState({ ...state, unreadCount: 0 })
      setReplyContent('')
      setShowReplyModal(false)
    } catch (error) {
      console.error('읽음 처리 실패:', error)
    }
  }

  return (
    <>
      <div 
        className={`tool-button ${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
        onClick={handleCardClick}
      >
        {/* 뱃지 - 플립 영향 받지 않도록 카드 밖으로 */}
        {state.unreadCount > 0 && !isFlipped && (
          <div className={styles.badge}>{state.unreadCount}</div>
        )}

        {/* 앞면 - 기존 구조 유지 */}
        <div className={styles.cardFront}>
          <div className="tool-button-icon">
            <img src="/characters/message.png" alt="쪽지함" className="tool-icon" />
          </div>
          <div className="tool-button-text">쪽지함</div>
        </div>

        {/* 뒷면 - 쪽지 내용 */}
        <div className={styles.cardBack}>
          {message ? (
            <div className={styles.messageContent}>
              <div className={styles.messageText}>{message.content}</div>
              <div className={styles.buttonGroup}>
                <button className={styles.confirmBtn} onClick={handleConfirm}>확인</button>
                <button className={styles.replyBtn} onClick={handleReplyClick}>답장</button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyMessage}>받은 쪽지가 없습니다</div>
          )}
        </div>
      </div>

      {/* 쪽지 확인 모달 - 카드 밖으로 */}
      {showDetailModal && message && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>쪽지 확인</div>
            <div className={styles.modalContent}>{message.content}</div>
            <div className={styles.modalButtons}>
              <button className={styles.modalConfirmBtn} onClick={handleConfirm}>확인</button>
              <button className={styles.modalReplyBtn} onClick={handleReplyClick}>답장</button>
            </div>
          </div>
        </div>
      )}

      {/* 답장 모달 - 카드 밖으로 */}
      {showReplyModal && (
        <div className={styles.modalOverlay} onClick={handleCancelReply}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>답장하기</div>
            <textarea
              className={styles.replyTextarea}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value.slice(0, 100))}
              placeholder="답장 내용을 입력하세요"
              maxLength={100}
            />
            <div className={styles.modalButtons}>
              <button className={styles.modalCancelBtn} onClick={handleCancelReply} disabled={loading}>
                취소
              </button>
              <button className={styles.modalSendBtn} onClick={handleSendReply} disabled={loading}>
                {loading ? '전송 중...' : '보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MessageBoxModule
