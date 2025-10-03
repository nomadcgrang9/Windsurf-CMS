import { useState, useEffect } from 'react'
import { getLearningGuide } from '../../services/learningGuideService'
import { parseStudentId } from '../../utils/formatUtils'

/**
 * 학습안내 모듈
 * - Column 2 상단 (60%)
 * - 교사 입력 내용 표시
 * - 30초 자동 폴링 업데이트
 * - 링크 자동 클릭 가능하게 변환
 */
function LearningGuideModule() {
  const [content, setContent] = useState('학습안내를 불러오는 중...')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 학습안내 조회 함수
  const fetchLearningGuide = async () => {
    try {
      // localStorage에서 학생 정보 가져오기
      const studentId = localStorage.getItem('studentId')
      if (!studentId) {
        setError('로그인 정보를 찾을 수 없습니다.')
        return
      }

      // 학번에서 학급 정보 추출 (예: "3121" → "3-1")
      const { grade, classNumber } = parseStudentId(studentId)
      const classInfo = `${grade}-${classNumber}`

      // Supabase에서 학습안내 조회
      const guide = await getLearningGuide(classInfo)

      if (guide && guide.content) {
        setContent(guide.content)
        setError(null)
      } else {
        setContent('아직 학습안내가 등록되지 않았습니다.')
      }
    } catch (err) {
      console.error('학습안내 조회 오류:', err)
      setError('학습안내를 불러오는 중 오류가 발생했습니다.')
      setContent('학습안내를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 컴포넌트 마운트 시 & 30초마다 자동 갱신
  useEffect(() => {
    fetchLearningGuide() // 즉시 실행

    const intervalId = setInterval(() => {
      fetchLearningGuide()
    }, 30000) // 30초 = 30,000ms

    // cleanup: 컴포넌트 언마운트 시 interval 정리
    return () => clearInterval(intervalId)
  }, [])

  // 링크를 클릭 가능하게 변환하는 함수
  const renderContentWithLinks = (text) => {
    if (!text) return null

    // URL 정규식 (http:// 또는 https://)
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
      // URL인 경우 링크로 변환
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#4A90E2',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
          >
            {part}
          </a>
        )
      }
      // 일반 텍스트
      return <span key={index}>{part}</span>
    })
  }

  return (
    <div className="module-card" style={{ cursor: 'default', overflow: 'hidden' }}>
      <h3 style={{
        fontFamily: "'DaHyun', 'Pretendard', sans-serif",
        fontSize: '28px',
        fontWeight: 700,
        color: '#333333',
        marginBottom: '16px',
        flexShrink: 0
      }}>
        학습안내
      </h3>
      <div style={{
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
        paddingRight: '8px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#999' }}>
            불러오는 중...
          </div>
        ) : (
          renderContentWithLinks(content)
        )}
      </div>
    </div>
  )
}

export default LearningGuideModule
