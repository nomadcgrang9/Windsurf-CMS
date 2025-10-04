import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { convertToRecordFormat, isGeminiApiKeyConfigured } from '../../services/geminiService'

/**
 * 관리자 - 도움내용 탭
 * - 학급/학년별 도움 기록 조회
 * - AI 생기부 변환 기능
 * - 교사 승인 기능
 */
function AdminHelpRecordsTab() {
  const [classInput, setClassInput] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [convertingId, setConvertingId] = useState(null) // AI 변환 중인 transaction_id

  // 학급/학년 파싱 함수
  const parseClassInput = (input) => {
    const trimmed = input.trim()
    
    // "3-1" 형식
    if (/^\d-\d+$/.test(trimmed)) {
      const [grade, classNum] = trimmed.split('-').map(Number)
      return { type: 'class', grade, classNum }
    }
    
    // "3학년" 형식
    if (/^\d학년$/.test(trimmed)) {
      const grade = parseInt(trimmed)
      return { type: 'grade', grade }
    }
    
    // "전체" 형식
    if (trimmed === '전체') {
      return { type: 'all' }
    }
    
    return null
  }

  // 도움 기록 조회
  const fetchRecords = async () => {
    if (!classInput.trim()) {
      setMessage('조회 범위를 입력해주세요 (예: 3-1, 3학년, 전체)')
      return
    }

    const parsed = parseClassInput(classInput)
    if (!parsed) {
      setMessage('올바른 형식으로 입력해주세요 (예: 3-1, 3학년, 전체)')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      let query = supabase
        .from('point_transactions')
        .select(`
          transaction_id,
          helper_student_id,
          helped_student_id,
          points,
          help_description,
          ai_converted_description,
          is_approved,
          approved_at,
          transaction_time,
          helper:students!point_transactions_helper_student_id_fkey(student_id, name, grade, class_number),
          helped:students!point_transactions_helped_student_id_fkey(student_id, name, grade, class_number)
        `)
        .not('help_description', 'is', null)
        .order('transaction_time', { ascending: false })

      // 학급/학년 필터링
      let filteredData = []
      
      if (parsed.type === 'class') {
        // 특정 학급: 도와준 학생이 해당 학급인 경우만
        const { data, error } = await query
        if (error) throw error
        
        filteredData = data.filter(record => 
          record.helper?.grade === parsed.grade && 
          record.helper?.class_number === parsed.classNum
        )
      } else if (parsed.type === 'grade') {
        // 특정 학년: 도와준 학생이 해당 학년인 경우만
        const { data, error } = await query
        if (error) throw error
        
        filteredData = data.filter(record => 
          record.helper?.grade === parsed.grade
        )
      } else {
        // 전체
        const { data, error } = await query
        if (error) throw error
        filteredData = data
      }

      setRecords(filteredData)
      setMessage(`총 ${filteredData.length}건의 기록을 찾았습니다.`)
    } catch (error) {
      console.error('도움 기록 조회 오류:', error)
      setMessage('기록을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // AI 변환 (Gemini API)
  const handleConvert = async (transactionId) => {
    // API 키 확인
    if (!isGeminiApiKeyConfigured()) {
      setMessage('❌ Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 추가해주세요.')
      return
    }

    // 해당 기록 찾기
    const record = records.find(r => r.transaction_id === transactionId)
    if (!record || !record.help_description) {
      setMessage('❌ 변환할 내용이 없습니다.')
      return
    }

    if (!window.confirm('AI로 생활기록부 형식으로 변환하시겠습니까?')) return

    setConvertingId(transactionId)
    setMessage('🤖 AI 변환 중...')

    try {
      // Gemini API 호출
      const convertedText = await convertToRecordFormat(record.help_description)

      // DB 업데이트
      const { error } = await supabase
        .from('point_transactions')
        .update({
          ai_converted_description: convertedText
        })
        .eq('transaction_id', transactionId)

      if (error) throw error

      setMessage('✅ AI 변환이 완료되었습니다.')
      fetchRecords() // 목록 새로고침
    } catch (error) {
      console.error('AI 변환 오류:', error)
      setMessage(`❌ AI 변환 중 오류가 발생했습니다: ${error.message}`)
    } finally {
      setConvertingId(null)
    }
  }

  // AI 변환 내용 삭제 (미승인)
  const handleReject = async (transactionId) => {
    if (!window.confirm('AI 변환 내용을 삭제하고 다시 변환하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('point_transactions')
        .update({
          ai_converted_description: null
        })
        .eq('transaction_id', transactionId)

      if (error) throw error

      setMessage('✅ AI 변환 내용이 삭제되었습니다. 다시 변환할 수 있습니다.')
      fetchRecords() // 목록 새로고침
    } catch (error) {
      console.error('삭제 오류:', error)
      setMessage('❌ 삭제 중 오류가 발생했습니다.')
    }
  }

  // 승인
  const handleApprove = async (transactionId) => {
    if (!window.confirm('이 기록을 승인하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('point_transactions')
        .update({
          is_approved: true,
          approved_at: new Date().toISOString()
        })
        .eq('transaction_id', transactionId)

      if (error) throw error

      setMessage('✅ 승인되었습니다.')
      fetchRecords() // 목록 새로고침
    } catch (error) {
      console.error('승인 오류:', error)
      setMessage('❌ 승인 중 오류가 발생했습니다.')
    }
  }

  // 승인 취소
  const handleUnapprove = async (transactionId) => {
    if (!window.confirm('승인을 취소하고 AI 변환 내용을 삭제하시겠습니까?\n다시 변환할 수 있습니다.')) return

    try {
      const { error } = await supabase
        .from('point_transactions')
        .update({
          is_approved: false,
          approved_at: null,
          ai_converted_description: null
        })
        .eq('transaction_id', transactionId)

      if (error) throw error

      setMessage('✅ 승인이 취소되었습니다. 다시 변환할 수 있습니다.')
      fetchRecords() // 목록 새로고침
    } catch (error) {
      console.error('승인 취소 오류:', error)
      setMessage('❌ 승인 취소 중 오류가 발생했습니다.')
    }
  }

  return (
    <div>
      <h2 style={{
        fontSize: '20px',
        fontWeight: 700,
        color: '#333',
        marginBottom: '24px'
      }}>
        📋 도움내용 관리
      </h2>

      {/* 조회 입력 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        alignItems: 'center'
      }}>
        <input
          type="text"
          value={classInput}
          onChange={(e) => setClassInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && fetchRecords()}
          placeholder="조회 범위 (예: 3-1, 3학년, 전체)"
          style={{
            flex: 1,
            maxWidth: '300px',
            padding: '12px',
            fontSize: '14px',
            border: '2px solid #E0E0E0',
            borderRadius: '6px',
            outline: 'none'
          }}
        />
        <button
          onClick={fetchRecords}
          disabled={loading}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 600,
            color: 'white',
            background: loading ? '#ccc' : '#667eea',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>

      {/* 메시지 */}
      {message && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: '#F0F8FA',
          border: '1px solid #B8D4D9',
          borderRadius: '6px',
          color: '#333',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* 도움 기록 테이블 */}
      {records.length > 0 && (
        <div style={{
          overflowX: 'auto',
          border: '1px solid #E0E0E0',
          borderRadius: '8px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ background: '#F5F5F5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E0E0E0' }}>날짜</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E0E0E0' }}>도와준 학생</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E0E0E0' }}>도움받은 학생</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E0E0E0', minWidth: '200px' }}>도와준 내용</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #E0E0E0', minWidth: '200px' }}>AI 변환 내용</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #E0E0E0' }}>승인</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #E0E0E0' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.transaction_id} style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <td style={{ padding: '12px' }}>
                    {new Date(record.transaction_time).toLocaleDateString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {record.helper?.name || '-'}
                    <br />
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      ({record.helper?.grade}-{record.helper?.class_number})
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {record.helped?.name || '-'}
                    <br />
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      ({record.helped?.grade}-{record.helped?.class_number})
                    </span>
                  </td>
                  <td style={{ padding: '12px', maxWidth: '300px', wordWrap: 'break-word' }}>
                    {record.help_description || '-'}
                  </td>
                  <td style={{ padding: '12px', maxWidth: '300px', wordWrap: 'break-word' }}>
                    {record.ai_converted_description || (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>미변환</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {record.is_approved ? (
                      <span style={{ color: '#4CAF50', fontWeight: 600 }}>✓ 승인됨</span>
                    ) : (
                      <span style={{ color: '#999' }}>❌ 미승인</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* 케이스 1: AI 변환 전 - 변환 버튼만 */}
                      {!record.ai_converted_description && (
                        <button
                          onClick={() => handleConvert(record.transaction_id)}
                          disabled={convertingId === record.transaction_id}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'white',
                            background: convertingId === record.transaction_id ? '#ccc' : '#FF9800',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: convertingId === record.transaction_id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {convertingId === record.transaction_id ? '변환 중...' : '생기부 변환'}
                        </button>
                      )}

                      {/* 케이스 2: AI 변환 후 + 미승인 - 승인/다시변환 버튼 */}
                      {record.ai_converted_description && !record.is_approved && (
                        <>
                          <button
                            onClick={() => handleApprove(record.transaction_id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'white',
                              background: '#4CAF50',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(record.transaction_id)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'white',
                              background: '#F44336',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            다시 변환
                          </button>
                        </>
                      )}

                      {/* 케이스 3: AI 변환 후 + 승인됨 - 미승인 버튼 */}
                      {record.ai_converted_description && record.is_approved && (
                        <button
                          onClick={() => handleUnapprove(record.transaction_id)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'white',
                            background: '#9E9E9E',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          미승인
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 통계 */}
      {records.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: '#F5F5F5',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          총 {records.length}건 | 승인 {records.filter(r => r.is_approved).length}건 | 
          미승인 {records.filter(r => !r.is_approved).length}건
        </div>
      )}
    </div>
  )
}

export default AdminHelpRecordsTab
