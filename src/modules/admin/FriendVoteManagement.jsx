import { useState, useEffect } from 'react'
import './FriendVoteManagement.css'
import { 
  startVoteSession, 
  endVoteSession, 
  getVoteResults, 
  resetVote,
  getActiveVoteSession 
} from '../../services/voteService'

/**
 * 친구 투표 관리 컴포넌트
 * - 투표 설정 (질문 3개, 시간 설정)
 * - 투표 시작/종료 및 결과 조회
 * - 투표 리셋
 */
function FriendVoteManagement() {
  const [accordions, setAccordions] = useState({ settings: true, results: false })
  
  // 투표 상태
  const [voteStatus, setVoteStatus] = useState('idle') // idle, active, completed
  const [currentSession, setCurrentSession] = useState(null)
  const [question1, setQuestion1] = useState('내 말을 경청하고 친절하게 대해준 친구')
  const [question2, setQuestion2] = useState('잘은 못해도 열심히 노력한 친구')
  const [question3, setQuestion3] = useState('자신감 있게 말하고 실력이 뛰어난 친구')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)

  // 초기 로드: 활성 세션 확인
  useEffect(() => {
    loadActiveSession()
  }, [])

  const loadActiveSession = async () => {
    try {
      const { data, error } = await getActiveVoteSession()
      if (error) throw error
      
      if (data) {
        setCurrentSession(data)
        setQuestion1(data.question_1)
        setQuestion2(data.question_2)
        setQuestion3(data.question_3)
        setVoteStatus('active')
        setAccordions({ settings: true, results: false })
      }
    } catch (error) {
      console.error('활성 세션 로드 오류:', error)
    }
  }

  // 투표 시작
  const handleStartVote = async () => {
    if (!question1.trim() || !question2.trim() || !question3.trim()) {
      alert('모든 질문을 입력하세요')
      return
    }
    
    setLoading(true)
    try {
      const { data, error } = await startVoteSession(
        question1,
        question2,
        question3
      )
      
      if (error) throw error
      
      setCurrentSession(data)
      setVoteStatus('active')
      setAccordions({ settings: true, results: false })
      alert('✅ 투표가 시작되었습니다!')
    } catch (error) {
      console.error('투표 시작 오류:', error)
      alert('투표 시작 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 투표 종료 및 결과 조회
  const handleEndAndViewResults = async () => {
    if (!currentSession) {
      alert('활성 세션이 없습니다.')
      return
    }

    setLoading(true)
    try {
      // 투표 종료
      const { error: endError } = await endVoteSession(currentSession.id)
      if (endError) throw endError

      // 결과 조회
      const { data: resultsData, error: resultsError } = await getVoteResults(currentSession.id)
      if (resultsError) throw resultsError

      setResults(resultsData)
      setVoteStatus('completed')
      setAccordions({ settings: false, results: true })
    } catch (error) {
      console.error('투표 종료 및 결과 조회 오류:', error)
      alert('결과 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 투표 리셋
  const handleResetVote = async () => {
    if (!confirm('투표를 리셋하시겠습니까? 모든 투표 데이터가 삭제됩니다.')) {
      return
    }

    if (!currentSession) {
      alert('리셋할 세션이 없습니다.')
      return
    }

    setLoading(true)
    try {
      const { error } = await resetVote(currentSession.id)
      if (error) throw error

      setCurrentSession(null)
      setResults(null)
      setVoteStatus('idle')
      setAccordions({ settings: true, results: false })
      alert('✅ 투표가 리셋되었습니다.')
    } catch (error) {
      console.error('투표 리셋 오류:', error)
      alert('리셋 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-vote-tab">
      <h2>📊 친구 투표 관리</h2>

      {/* 투표 설정 */}
      <div className="vote-section">
        <button 
          className="section-toggle"
          onClick={() => setAccordions(prev => ({ ...prev, settings: !prev.settings }))}
        >
          {accordions.settings ? '▼' : '▶'} 투표 설정 (전체 학년 공통 적용)
        </button>

        {accordions.settings && (
          <div className="section-content">
            <div className="question-settings">
              <label className="settings-label">📝 투표 질문 설정</label>
              
              <div className="question-item">
                <span className="question-number">1️⃣</span>
                <input
                  type="text"
                  value={question1}
                  onChange={(e) => setQuestion1(e.target.value)}
                  className="question-input"
                  placeholder="첫 번째 질문"
                  disabled={voteStatus !== 'idle'}
                />
              </div>

              <div className="question-item">
                <span className="question-number">2️⃣</span>
                <input
                  type="text"
                  value={question2}
                  onChange={(e) => setQuestion2(e.target.value)}
                  className="question-input"
                  placeholder="두 번째 질문"
                  disabled={voteStatus !== 'idle'}
                />
              </div>

              <div className="question-item">
                <span className="question-number">3️⃣</span>
                <input
                  type="text"
                  value={question3}
                  onChange={(e) => setQuestion3(e.target.value)}
                  className="question-input"
                  placeholder="세 번째 질문"
                  disabled={voteStatus !== 'idle'}
                />
              </div>
            </div>


            {voteStatus === 'idle' && (
              <>
                <button onClick={handleStartVote} className="start-btn" disabled={loading}>
                  {loading ? '시작 중...' : '투표 시작'}
                </button>
                <div className="info-box">
                  💡 투표 시작 시 모든 학년의 학생 페이지에 투표 버튼이 활성화됩니다. 적절한 시간 후 종료 버튼을 눌러주세요.
                </div>
              </>
            )}

            {voteStatus === 'active' && (
              <>
                <div className="vote-status">
                  <span className="status-label">상태:</span>
                  <span className="status-value active">🟢 진행 중</span>
                </div>
                <div className="info-box">
                  💡 학생들이 투표 중입니다. 충분한 시간이 지나면 결과 조회 버튼을 클릭하세요.
                </div>
                <button onClick={handleEndAndViewResults} className="end-btn" disabled={loading}>
                  {loading ? '처리 중...' : '투표 종료 및 결과 조회'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 투표 결과 */}
      {voteStatus === 'completed' && (
        <div className="vote-section">
          <button 
            className="section-toggle"
            onClick={() => setAccordions(prev => ({ ...prev, results: !prev.results }))}
          >
            {accordions.results ? '▼' : '▶'} 투표 결과
          </button>

          {accordions.results && (
            <div className="section-content">
              {results ? (
                <>
                  <div className="result-category">
                    <h4 className="category-title">🏆 {question1}</h4>
                    <div className="result-list">
                      {results.category1 && results.category1.length > 0 ? (
                        results.category1.map((student, index) => (
                          <div key={student.studentId} className="result-item">
                            <span className="rank">
                              {index === 0 && '1위 🥇'}
                              {index === 1 && '2위 🥈'}
                              {index === 2 && '3위 🥉'}
                            </span>
                            <span className="student-name">{student.name}</span>
                            <span className="vote-count">({student.votes}표)</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>투표 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div className="result-category">
                    <h4 className="category-title">🏆 {question2}</h4>
                    <div className="result-list">
                      {results.category2 && results.category2.length > 0 ? (
                        results.category2.map((student, index) => (
                          <div key={student.studentId} className="result-item">
                            <span className="rank">
                              {index === 0 && '1위 🥇'}
                              {index === 1 && '2위 🥈'}
                              {index === 2 && '3위 🥉'}
                            </span>
                            <span className="student-name">{student.name}</span>
                            <span className="vote-count">({student.votes}표)</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>투표 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div className="result-category">
                    <h4 className="category-title">🏆 {question3}</h4>
                    <div className="result-list">
                      {results.category3 && results.category3.length > 0 ? (
                        results.category3.map((student, index) => (
                          <div key={student.studentId} className="result-item">
                            <span className="rank">
                              {index === 0 && '1위 🥇'}
                              {index === 1 && '2위 🥈'}
                              {index === 2 && '3위 🥉'}
                            </span>
                            <span className="student-name">{student.name}</span>
                            <span className="vote-count">({student.votes}표)</span>
                          </div>
                        ))
                      ) : (
                        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>투표 결과가 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div className="info-box">
                    💡 위 결과를 학생들에게 화면 공유로 보여주세요.
                    학생들이 자신의 이름을 확인하고 포인트를 추가합니다.
                  </div>

                  <button onClick={handleResetVote} className="reset-btn" disabled={loading}>
                    {loading ? '리셋 중...' : '투표 리셋'}
                  </button>
                </>
              ) : (
                <p style={{ color: '#999', textAlign: 'center', padding: '40px' }}>결과를 불러오는 중...</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FriendVoteManagement
