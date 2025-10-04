import { useState } from 'react'
import { createLearningGuide, updateFullLearningGuide } from '../services/learningGuideService'

/**
 * 학습안내 테스트 페이지
 * - 학습안내 직접 입력 및 업데이트
 * - 학생 페이지에서 실시간 확인용
 */
function TestLearningGuidePage() {
  const [classInfo, setClassInfo] = useState('3-1')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // 학습안내 생성/업데이트
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setMessage('❌ 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // 먼저 업데이트 시도
      try {
        await updateFullLearningGuide(classInfo, content, '') // additionalContent는 빈 문자열로 전달
        setMessage('✅ 학습안내가 업데이트되었습니다!')
      } catch (updateError) {
        // 업데이트 실패 시 새로 생성
        await createLearningGuide(classInfo, content, '') // additionalContent는 빈 문자열로 전달
        setMessage('✅ 학습안내가 생성되었습니다!')
      }
      
      // 성공 후 내용 초기화
      setContent('')
    } catch (error) {
      console.error('학습안내 저장 오류:', error)
      setMessage('❌ 저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: "'Pretendard', sans-serif"
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#333',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          📚 학습안내 테스트
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          학습안내를 입력하면 학생 페이지에서 실시간으로 확인할 수 있습니다.
        </p>

        <form onSubmit={handleSubmit}>
          {/* 학급 선택 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px'
            }}>
              학급 선택
            </label>
            <select
              value={classInfo}
              onChange={(e) => setClassInfo(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #E0E0E0',
                borderRadius: '8px',
                outline: 'none',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            >
              <option value="3-1">3학년 1반</option>
              <option value="3-2">3학년 2반</option>
              <option value="3-3">3학년 3반</option>
              <option value="4-1">4학년 1반</option>
              <option value="4-2">4학년 2반</option>
              <option value="4-3">4학년 3반</option>
              <option value="6-1">6학년 1반</option>
              <option value="6-2">6학년 2반</option>
              <option value="6-3">6학년 3반</option>
              <option value="6-4">6학년 4반</option>
              <option value="6-5">6학년 5반</option>
              <option value="6-6">6학년 6반</option>
              <option value="6-7">6학년 7반</option>
            </select>
          </div>

          {/* 학습안내 내용 */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '8px'
            }}>
              학습안내 내용
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="학습안내 내용을 입력하세요.&#10;&#10;예시:&#10;오늘의 학습 계획&#10;1. 수학: 3단원 문제풀이&#10;2. 국어: 독서록 작성&#10;&#10;참고 자료: https://example.com"
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '16px',
                fontSize: '16px',
                border: '2px solid #E0E0E0',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: "'Pretendard', sans-serif",
                lineHeight: '1.6',
                transition: 'border-color 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
            />
            <p style={{
              fontSize: '14px',
              color: '#999',
              marginTop: '8px'
            }}>
              💡 팁: URL을 입력하면 학생 페이지에서 클릭 가능한 링크로 표시됩니다.
            </p>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              fontWeight: 600,
              color: 'white',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            {loading ? '저장 중...' : '학습안내 저장'}
          </button>
        </form>

        {/* 메시지 표시 */}
        {message && (
          <div style={{
            marginTop: '24px',
            padding: '16px',
            borderRadius: '8px',
            background: message.startsWith('✅') ? '#E8F5E9' : '#FFEBEE',
            color: message.startsWith('✅') ? '#2E7D32' : '#C62828',
            fontSize: '16px',
            fontWeight: 500,
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* 안내 메시지 */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#F5F5F5',
          borderRadius: '8px',
          borderLeft: '4px solid #667eea'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '12px'
          }}>
            📌 사용 방법
          </h3>
          <ol style={{
            fontSize: '14px',
            color: '#666',
            lineHeight: '1.8',
            paddingLeft: '20px',
            margin: 0
          }}>
            <li>학급을 선택합니다.</li>
            <li>학습안내 내용을 입력합니다.</li>
            <li>"학습안내 저장" 버튼을 클릭합니다.</li>
            <li>학생 페이지에서 로그인하여 확인합니다.</li>
            <li>30초마다 자동으로 업데이트됩니다.</li>
          </ol>
        </div>

        {/* 학생 페이지 링크 */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center'
        }}>
          <a
            href="/student/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#667eea',
              background: 'white',
              border: '2px solid #667eea',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#667eea'
              e.target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'white'
              e.target.style.color = '#667eea'
            }}
          >
            학생 로그인 페이지로 이동 →
          </a>
        </div>
      </div>
    </div>
  )
}

export default TestLearningGuidePage
