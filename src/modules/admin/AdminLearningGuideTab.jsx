import { useState } from 'react'
import { createLearningGuide, updateLearningGuide } from '../../services/learningGuideService'

/**
 * 관리자 - 학습안내 입력 탭
 * - 학년별 선택 (3학년, 4학년, 6학년)
 * - 해당 학년의 모든 반에 동일 내용 저장
 * - 서버 부하 감소를 위한 학년별 일괄 저장
 */
function AdminLearningGuideTab() {
  const [grade, setGrade] = useState('3')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // 학년별 반 목록
  const gradeClasses = {
    '3': ['3-1', '3-2', '3-3'],
    '4': ['4-1', '4-2', '4-3'],
    '6': ['6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '6-7']
  }

  // 학습안내 저장 (학년별 모든 반에 저장)
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!content.trim()) {
      setMessage('❌ 내용을 입력해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const classes = gradeClasses[grade]
      let successCount = 0
      
      // 해당 학년의 모든 반에 저장
      for (const classInfo of classes) {
        try {
          // 먼저 업데이트 시도
          await updateLearningGuide(classInfo, content)
          successCount++
        } catch (updateError) {
          // 업데이트 실패 시 새로 생성
          try {
            await createLearningGuide(classInfo, content)
            successCount++
          } catch (createError) {
            console.error(`${classInfo} 저장 실패:`, createError)
          }
        }
      }
      
      if (successCount === classes.length) {
        setMessage(`✅ ${grade}학년 전체 반(${classes.join(', ')})에 저장되었습니다!`)
        setContent('')
      } else {
        setMessage(`⚠️ ${successCount}/${classes.length}개 반에 저장되었습니다. 일부 실패했습니다.`)
      }
    } catch (error) {
      console.error('학습안내 저장 오류:', error)
      setMessage('❌ 저장 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#333',
        marginBottom: '10px'
      }}>
        📚 학습안내 입력
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px'
      }}>
        학년을 선택하면 해당 학년의 모든 반에 동일한 학습안내가 저장됩니다.
      </p>

      <form onSubmit={handleSubmit}>
        {/* 학년 선택 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            학년 선택
          </label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #E0E0E0',
              borderRadius: '8px',
              outline: 'none',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="3">3학년 (3-1, 3-2, 3-3)</option>
            <option value="4">4학년 (4-1, 4-2, 4-3)</option>
            <option value="6">6학년 (6-1, 6-2, 6-3, 6-4, 6-5, 6-6, 6-7)</option>
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
              lineHeight: '1.6'
            }}
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
            background: loading ? '#ccc' : '#667eea',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!loading) e.target.style.background = '#5568d3'
          }}
          onMouseLeave={(e) => {
            if (!loading) e.target.style.background = '#667eea'
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
          background: message.startsWith('✅') ? '#E8F5E9' : message.startsWith('⚠️') ? '#FFF3E0' : '#FFEBEE',
          color: message.startsWith('✅') ? '#2E7D32' : message.startsWith('⚠️') ? '#F57C00' : '#C62828',
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
        border: '1px solid #E0E0E0'
      }}>
        <h3 style={{
          fontSize: '16px',
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
          <li>학년을 선택합니다 (3학년, 4학년, 6학년)</li>
          <li>학습안내 내용을 입력합니다</li>
          <li>"학습안내 저장" 버튼을 클릭합니다</li>
          <li>선택한 학년의 모든 반에 동일한 내용이 저장됩니다</li>
          <li>학생 페이지에서 30초마다 자동으로 업데이트됩니다</li>
        </ol>
      </div>
    </div>
  )
}

export default AdminLearningGuideTab
