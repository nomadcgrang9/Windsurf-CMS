import { useState } from 'react'
import AdminHelpRecordsTab from './AdminHelpRecordsTab'
import LearningRecordAdmin from './LearningRecordAdmin'

/**
 * AI생기부 탭 래퍼
 * - 쪽버튼 구조: 도움내용 관리 / 배움기록 관리
 * - 두 섹션 동시에 열릴 수 있음
 */
function AIRecordTab() {
  const [showHelp, setShowHelp] = useState(true)
  const [showLearning, setShowLearning] = useState(false)

  return (
    <div style={{
      fontFamily: "'Pretendard', sans-serif"
    }}>
      {/* 도움내용 관리 섹션 */}
      <div style={{
        marginBottom: '20px'
      }}>
        {/* 쪽버튼 */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#333',
            background: '#F5F5F5',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '20px' }}>▶</span>
          도움내용 관리
        </button>

        {/* 내용 */}
        {showHelp && (
          <div style={{
            marginTop: '10px',
            padding: '20px',
            background: 'white',
            border: '1px solid #E0E0E0',
            borderRadius: '8px'
          }}>
            <AdminHelpRecordsTab />
          </div>
        )}
      </div>

      {/* 배움기록 관리 섹션 */}
      <div>
        {/* 쪽버튼 */}
        <button
          onClick={() => setShowLearning(!showLearning)}
          style={{
            width: '100%',
            padding: '16px 24px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#333',
            background: '#F5F5F5',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span style={{ fontSize: '20px' }}>▶</span>
          배움기록 관리
        </button>

        {/* 내용 */}
        {showLearning && (
          <div style={{
            marginTop: '10px',
            padding: '20px',
            background: 'white',
            border: '1px solid #E0E0E0',
            borderRadius: '8px'
          }}>
            <LearningRecordAdmin />
          </div>
        )}
      </div>
    </div>
  )
}

export default AIRecordTab
