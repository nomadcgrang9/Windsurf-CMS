import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import './LearningRecordPanel.css'

/**
 * 배움기록 작성 패널
 * - 3단 레이아웃: 핵심배움 | 학습과정 | 생각과 질문
 * - 섹션 1 또는 2 중 하나만 입력해도 제출 가능
 */
function LearningRecordPanel() {
  const [studentId, setStudentId] = useState(null)
  const [coreLearning, setCoreLearning] = useState('')
  const [selectedProcesses, setSelectedProcesses] = useState([])
  const [thoughts, setThoughts] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [todayRecord, setTodayRecord] = useState(null)

  // 학습과정 체크리스트 항목
  const processOptions = [
    "친구 어려워하는 것 도와줌",
    "용기내어 질문함",
    "공부 순서 정하기 등 계획세움",
    "포기하지 않고 해결함",
    "새로운 방법으로 시도함",
    "친구 말을 귀담아 들음",
    "친구들과 협력해서 문제해결함",
    "대화 또는 발표할 때 자신있게 말했음"
  ]

  // 학생 ID 가져오기 & 오늘 기록 확인
  useEffect(() => {
    const id = localStorage.getItem('studentId')
    if (id) {
      setStudentId(id) // TEXT 타입이므로 parseInt 제거
      fetchTodayRecord(id)
    }
  }, [])

  // 오늘 작성한 기록 불러오기
  const fetchTodayRecord = async (id) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('learning_records')
        .select('*')
        .eq('student_id', id)
        .eq('record_date', today)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 = 데이터 없음

      if (data) {
        setTodayRecord(data)
        setCoreLearning(data.core_learning || '')
        setSelectedProcesses(data.learning_process || [])
        setThoughts(data.thoughts_and_questions || '')
        
        if (data.is_submitted) {
          setMessage('✅ 오늘 배움기록을 이미 제출했습니다.')
        } else {
          setMessage('📝 임시저장된 기록을 불러왔습니다.')
        }
      }
    } catch (error) {
      console.error('오늘 기록 조회 오류:', error)
    }
  }

  // 체크박스 토글
  const handleProcessToggle = (process) => {
    setSelectedProcesses(prev => 
      prev.includes(process)
        ? prev.filter(p => p !== process)
        : [...prev, process]
    )
  }

  // 제출 가능 여부 확인
  const canSubmit = () => {
    return coreLearning.trim().length >= 10 || selectedProcesses.length > 0
  }

  // 임시저장
  const handleTempSave = async () => {
    if (!studentId) {
      setMessage('❌ 로그인이 필요합니다.')
      return
    }

    setIsSaving(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      
      const recordData = {
        student_id: studentId,
        record_date: today,
        core_learning: coreLearning.trim() || null,
        learning_process: selectedProcesses,
        thoughts_and_questions: thoughts.trim() || null,
        is_submitted: false,
        updated_at: new Date().toISOString()
      }

      if (todayRecord) {
        // 업데이트
        const { error } = await supabase
          .from('learning_records')
          .update(recordData)
          .eq('record_id', todayRecord.record_id)

        if (error) throw error
      } else {
        // 새로 생성
        const { data, error } = await supabase
          .from('learning_records')
          .insert([recordData])
          .select()
          .single()

        if (error) throw error
        setTodayRecord(data)
      }

      setMessage('✅ 임시저장되었습니다.')
    } catch (error) {
      console.error('임시저장 오류:', error)
      setMessage('❌ 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 제출하기
  const handleSubmit = async () => {
    if (!studentId) {
      setMessage('❌ 로그인이 필요합니다.')
      return
    }

    if (!canSubmit()) {
      setMessage('❌ 핵심배움(10자 이상) 또는 학습과정(1개 이상)을 입력해주세요.')
      return
    }

    if (todayRecord?.is_submitted) {
      setMessage('❌ 오늘 배움기록을 이미 제출했습니다.')
      return
    }

    if (!window.confirm('배움기록을 제출하시겠습니까?\n제출 후에는 수정할 수 없습니다.')) {
      return
    }

    setIsSaving(true)

    try {
      const today = new Date().toISOString().split('T')[0]
      
      const recordData = {
        student_id: studentId,
        record_date: today,
        core_learning: coreLearning.trim() || null,
        learning_process: selectedProcesses,
        thoughts_and_questions: thoughts.trim() || null,
        is_submitted: true,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if (todayRecord) {
        // 업데이트
        const { error } = await supabase
          .from('learning_records')
          .update(recordData)
          .eq('record_id', todayRecord.record_id)

        if (error) throw error
      } else {
        // 새로 생성
        const { data, error } = await supabase
          .from('learning_records')
          .insert([recordData])
          .select()
          .single()

        if (error) throw error
        setTodayRecord(data)
      }

      setMessage('✅ 배움기록이 제출되었습니다!')
      
      // 제출 후 입력 필드 비활성화
      setTimeout(() => {
        fetchTodayRecord(studentId)
      }, 1000)
    } catch (error) {
      console.error('제출 오류:', error)
      setMessage('❌ 제출 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const isSubmitted = todayRecord?.is_submitted

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '8px 12px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        marginBottom: '8px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          fontSize: '30px',
          fontWeight: 700,
          color: '#333',
          margin: 0
        }}>
          배움기록
        </h2>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '12px',
          background: '#B8D4D9',
          border: '1px solid #A0C4C9',
          borderRadius: '6px',
          color: 'white',
          fontSize: '14px',
          fontFamily: "'DaHyun', 'Pretendard', sans-serif",
          textAlign: 'left'
        }}>
          {message.replace(/✅|❌/g, '').trim()}
        </div>
      )}

      {/* 2단 레이아웃 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        flex: 1,
        minHeight: 0,
        overflow: 'visible'
      }}>
        {/* 섹션 1: 오늘의 핵심배움 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #E0E0E0',
          borderRadius: '8px',
          padding: '10px',
          background: '#FAFAFA',
          overflow: 'hidden'
        }}>
          <h3 style={{
            fontFamily: "'DaHyun', 'Pretendard', sans-serif",
            fontSize: '18px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            1. 오늘의 핵심배움
          </h3>
          <textarea
            value={coreLearning}
            onChange={(e) => setCoreLearning(e.target.value)}
            placeholder="오늘 배운 내용 중 가장 중요하다고 생각하는 것을 적어보세요."
            disabled={isSubmitted}
            maxLength={300}
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '15px',
              border: '1px solid #E0E0E0',
              borderRadius: '6px',
              resize: 'none',
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              background: isSubmitted ? '#f5f5f5' : 'white',
              lineHeight: '1.5'
            }}
          />
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#333',
            textAlign: 'right',
            fontFamily: "'DaHyun', 'Pretendard', sans-serif"
          }}>
            {coreLearning.length}/300자
          </div>
          <div style={{
            marginTop: '6px',
            fontSize: '12px',
            color: '#666',
            fontStyle: 'italic',
            fontFamily: "'DaHyun', 'Pretendard', sans-serif"
          }}>
            예) 영어: 동작을 나타내는 단어 5개 따라 말하기
          </div>
        </div>

        {/* 섹션 2: 학습과정 돌아보기 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          border: '2px solid #E0E0E0',
          borderRadius: '8px',
          padding: '10px',
          background: '#FAFAFA',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontFamily: "'DaHyun', 'Pretendard', sans-serif",
            fontSize: '18px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            2. 학습과정 돌아보기
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '6px',
            overflowY: 'auto'
          }}>
            {processOptions.map((option, index) => (
              <label
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  cursor: isSubmitted ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  background: 'transparent',
                  transition: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedProcesses.includes(option)}
                  onChange={() => handleProcessToggle(option)}
                  disabled={isSubmitted}
                  className="custom-checkbox"
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    cursor: isSubmitted ? 'not-allowed' : 'pointer',
                    flexShrink: 0
                  }}
                />
                <span style={{
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  fontSize: '14px',
                  color: '#333',
                  lineHeight: '1.3'
                }}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        </div>

      </div>

      {/* 버튼 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid #E0E0E0'
      }}>
        <button
          onClick={handleTempSave}
          disabled={isSaving || isSubmitted}
          style={{
            fontFamily: "'DaHyun', 'Pretendard', sans-serif",
            padding: '8px 20px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#666',
            background: 'white',
            border: '2px solid #E0E0E0',
            borderRadius: '6px',
            cursor: (isSaving || isSubmitted) ? 'not-allowed' : 'pointer',
            opacity: (isSaving || isSubmitted) ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          임시저장
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving || isSubmitted || !canSubmit()}
          style={{
            fontFamily: "'DaHyun', 'Pretendard', sans-serif",
            padding: '8px 20px',
            fontSize: '15px',
            fontWeight: 600,
            color: 'white',
            background: (isSaving || isSubmitted || !canSubmit()) ? '#ccc' : '#B8D4D9',
            border: 'none',
            borderRadius: '6px',
            cursor: (isSaving || isSubmitted || !canSubmit()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          제출하기
        </button>
      </div>
    </div>
  )
}

export default LearningRecordPanel
