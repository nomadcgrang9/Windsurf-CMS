import { useState, useEffect } from 'react'
import {
  getLatestRecords,
  getStudentRecords,
  saveAIConversion,
  approveRecord,
  deleteRecord
} from '../../services/learningRecordService'
import { generateSchoolRecord } from '../../services/geminiService'
import { exportLearningRecords } from '../../utils/excelExport'
import './LearningRecordAdmin.css'

/**
 * 배움기록 관리 컴포넌트
 * - AI생기부 탭 내부의 쪽버튼으로 표시
 * - 학급별 최신 기록 조회
 * - AI 변환, 승인, 삭제 기능
 */
function LearningRecordAdmin() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [classInfo, setClassInfo] = useState('3-1')
  const [message, setMessage] = useState('')
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [studentDates, setStudentDates] = useState({})
  const [converting, setConverting] = useState(null)

  // 최신 기록 조회
  const fetchRecords = async () => {
    if (!classInfo.trim()) {
      setMessage('학급/학년을 입력하세요')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const data = await getLatestRecords(classInfo)
      setRecords(data)
      
      if (data.length === 0) {
        setMessage(`${classInfo} 학급의 기록이 없습니다`)
      }
    } catch (error) {
      console.error('기록 조회 오류:', error)
      setMessage('기록을 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 학생별 과거 날짜 목록 조회
  const fetchStudentDates = async (studentId) => {
    try {
      const data = await getStudentRecords(studentId)
      setStudentDates(prev => ({
        ...prev,
        [studentId]: data
      }))
    } catch (error) {
      console.error('날짜 목록 조회 오류:', error)
    }
  }

  // 날짜 토글
  const handleDateToggle = (studentId) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null)
    } else {
      setExpandedStudent(studentId)
      if (!studentDates[studentId]) {
        fetchStudentDates(studentId)
      }
    }
  }

  // 날짜 선택 시 해당 기록으로 교체
  const handleDateSelect = (studentId, selectedRecord) => {
    setRecords(prev => prev.map(record => 
      record.student_id === studentId ? {
        ...selectedRecord,
        student_name: record.student_name
      } : record
    ))
    setExpandedStudent(null)
  }

  // AI 변환
  const handleConvert = async (record) => {
    if (!record.core_learning) {
      alert('핵심배움 내용이 없습니다')
      return
    }

    setConverting(record.record_id)

    try {
      const aiContent = await generateSchoolRecord(
        record.student_name,
        record.core_learning,
        record.learning_process || []
      )

      await saveAIConversion(record.record_id, aiContent)

      // UI 업데이트
      setRecords(prev => prev.map(r => 
        r.record_id === record.record_id 
          ? { ...r, ai_converted_record: aiContent }
          : r
      ))

      setMessage('AI 변환이 완료되었습니다')
    } catch (error) {
      console.error('AI 변환 오류:', error)
      alert('AI 변환 중 오류가 발생했습니다')
    } finally {
      setConverting(null)
    }
  }

  // 승인
  const handleApprove = async (recordId) => {
    if (!confirm('이 기록을 승인하시겠습니까?')) {
      return
    }

    try {
      await approveRecord(recordId)

      setRecords(prev => prev.map(r => 
        r.record_id === recordId 
          ? { ...r, is_approved: true }
          : r
      ))

      setMessage('승인되었습니다')
    } catch (error) {
      console.error('승인 오류:', error)
      alert('승인 중 오류가 발생했습니다')
    }
  }

  // 삭제
  const handleDelete = async (recordId) => {
    if (!confirm('이 기록을 삭제하시겠습니까? 복구할 수 없습니다.')) {
      return
    }

    try {
      await deleteRecord(recordId)

      setRecords(prev => prev.filter(r => r.record_id !== recordId))

      setMessage('삭제되었습니다')
    } catch (error) {
      console.error('삭제 오류:', error)
      alert('삭제 중 오류가 발생했습니다')
    }
  }

  // Excel 다운로드
  const handleExport = () => {
    if (!classInfo.trim()) {
      alert('학급/학년을 먼저 조회해주세요')
      return
    }

    if (records.length === 0) {
      alert('다운로드할 기록이 없습니다')
      return
    }

    const aiConvertedRecords = records.filter(r => r.ai_converted_record)
    
    if (aiConvertedRecords.length === 0) {
      alert('AI 변환된 기록이 없습니다')
      return
    }

    exportLearningRecords(records, classInfo)
  }

  // 컴포넌트 마운트 시 기본 조회
  useEffect(() => {
    fetchRecords()
  }, [])

  return (
    <div className="learning-record-admin">
      {/* 검색 바 */}
      <div className="search-bar">
        <div className="search-input-group">
          <label>학급/학년:</label>
          <input
            type="text"
            value={classInfo}
            onChange={(e) => setClassInfo(e.target.value)}
            placeholder="예: 3-1, 3-2, 3학년"
            onKeyPress={(e) => e.key === 'Enter' && fetchRecords()}
          />
          <button onClick={fetchRecords} disabled={loading}>
            {loading ? '조회 중...' : '검색'}
          </button>
        </div>
        <button className="export-btn" onClick={handleExport}>
          📥 전체 다운로드
        </button>
      </div>

      {/* 메시지 */}
      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {/* 테이블 */}
      <div className="table-container">
        <table className="record-table">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>번호</th>
              <th style={{ width: '10%' }}>학생명</th>
              <th style={{ width: '12%' }}>날짜</th>
              <th style={{ width: '28%' }}>핵심배움</th>
              <th style={{ width: '30%' }}>AI 변환 내용</th>
              <th style={{ width: '10%' }}>작업</th>
              <th style={{ width: '5%' }}>승인</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                  불러오는 중...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  조회된 기록이 없습니다
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr key={record.record_id}>
                  {/* 번호 */}
                  <td>{index + 1}</td>

                  {/* 학생명 */}
                  <td>{record.student_name}</td>

                  {/* 날짜 */}
                  <td className="date-cell">
                    <div className="date-toggle">
                      <span>{new Date(record.record_date).toLocaleDateString('ko-KR')}</span>
                      <button
                        className="toggle-btn"
                        onClick={() => handleDateToggle(record.student_id)}
                      >
                        {expandedStudent === record.student_id ? '▲' : '▼'}
                      </button>
                    </div>

                    {/* 날짜 드롭다운 */}
                    {expandedStudent === record.student_id && (
                      <div className="date-dropdown">
                        {studentDates[record.student_id]?.map((dateRecord) => (
                          <div
                            key={dateRecord.record_id}
                            className={`date-option ${dateRecord.record_id === record.record_id ? 'active' : ''}`}
                            onClick={() => handleDateSelect(record.student_id, dateRecord)}
                          >
                            {new Date(dateRecord.record_date).toLocaleDateString('ko-KR')}
                            {dateRecord.record_id === record.record_id && ' ✓'}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* 핵심배움 */}
                  <td className="core-learning">
                    {record.core_learning ? (
                      record.core_learning.length > 50
                        ? record.core_learning.substring(0, 50) + '...'
                        : record.core_learning
                    ) : (
                      <span style={{ color: '#999' }}>작성 안 함</span>
                    )}
                  </td>

                  {/* AI 변환 내용 */}
                  <td className="ai-content">
                    {record.ai_converted_record ? (
                      record.ai_converted_record.length > 80
                        ? record.ai_converted_record.substring(0, 80) + '...'
                        : record.ai_converted_record
                    ) : (
                      <button
                        className="convert-btn"
                        onClick={() => handleConvert(record)}
                        disabled={converting === record.record_id}
                      >
                        {converting === record.record_id ? '변환 중...' : '변환'}
                      </button>
                    )}
                  </td>

                  {/* 작업 */}
                  <td className="actions">
                    {record.ai_converted_record && (
                      <>
                        <button
                          className="approve-btn"
                          onClick={() => handleApprove(record.record_id)}
                          disabled={record.is_approved}
                        >
                          {record.is_approved ? '승인됨' : '승인'}
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(record.record_id)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </td>

                  {/* 승인 */}
                  <td className="approval">
                    <input
                      type="checkbox"
                      checked={record.is_approved || false}
                      readOnly
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LearningRecordAdmin
