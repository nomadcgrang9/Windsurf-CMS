import { useEffect, useState } from 'react'
import { getAllStudentsWithLoginStatus } from '../../services/studentService'
import { 
  getLearningGuides, // 조회 함수 추가
  createLearningGuide, 
  updateFullLearningGuide, 
  updateLearningGuideContent, 
  updateLearningGuideAdditionalContent 
} from '../../services/learningGuideService'

/**
 * 관리자 - 학습안내 입력 탭
 * - 학년/학급 대상을 텍스트로 입력
 * - 서버 부하 감소를 위한 일괄 저장 설계
 */
function AdminLearningGuideTab() {
  const [targetInput, setTargetInput] = useState('')
  const [content, setContent] = useState('')
  const [additionalContent, setAdditionalContent] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [allClasses, setAllClasses] = useState([])

  // 학습안내 조회 관련 state
  const [accordions, setAccordions] = useState({ search: false, input: true })
  const [searchTarget, setSearchTarget] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResult, setSearchResult] = useState(null)
  const [searchMessage, setSearchMessage] = useState('')

  useEffect(() => {
    const fetchClassMap = async () => {
      try {
        const students = await getAllStudentsWithLoginStatus()
        const classMap = students.reduce((acc, student) => {
          const gradeKey = String(student.grade)
          if (!acc[gradeKey]) acc[gradeKey] = new Set()
          acc[gradeKey].add(`${student.grade}-${student.class_number}`)
          return acc
        }, {})
        const normalized = Object.entries(classMap).reduce((acc, [grade, classSet]) => {
          acc[grade] = Array.from(classSet).sort()
          return acc
        }, {})

        setAllClasses(normalized)
      } catch (error) {
        console.error('학급 정보 불러오기 실패:', error)
      }
    }

    fetchClassMap()
  }, [])

  // 학년별 반 목록
  const gradeClasses = {
    '3': ['3-1', '3-2', '3-3'],
    '4': ['4-1', '4-2', '4-3'],
    '6': ['6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '6-7']
  }

  const parseTargetScope = (input) => {
    const normalized = input.trim().replace(/\s+/g, '')

    if (!normalized) {
      return { error: '❌ 대상을 입력해주세요. (예: 3-1, 3학년, 전체)' }
    }

    const classMap = Object.keys(allClasses).length > 0 ? allClasses : gradeClasses

    if (normalized === '전체') {
      const classes = Object.values(classMap).flat()

      if (!classes.length) {
        return { error: '❌ 저장할 학급 정보가 없습니다. 먼저 학급 설정을 확인해주세요.' }
      }

      return {
        label: '전체 학년',
        classes
      }
    }

    const gradeMatch = normalized.match(/^(\d+)학년$/)
    if (gradeMatch) {
      const gradeKey = gradeMatch[1]
      const classes = classMap[gradeKey]

      if (!classes || classes.length === 0) {
        return { error: `❌ ${gradeKey}학년 학급 정보가 설정되어 있지 않습니다.` }
      }

      return {
        label: `${gradeKey}학년`,
        classes
      }
    }

    const classMatch = normalized.match(/^(\d+)-(\d+)$/)
    if (classMatch) {
      const gradeKey = classMatch[1]
      const classNumber = classMatch[2]
      const classInfo = `${gradeKey}-${classNumber}`

      const gradeClassesList = classMap[gradeKey]

      if (!gradeClassesList || gradeClassesList.length === 0) {
        return { error: `❌ ${gradeKey}학년 학급 정보가 설정되어 있지 않습니다.` }
      }

      if (!gradeClassesList.includes(classInfo)) {
        return { error: `❌ ${classInfo} 학급은 존재하지 않습니다.` }
      }

      return {
        label: `${gradeKey}학년 ${classNumber}반`,
        classes: [classInfo]
      }
    }

    return { error: '❌ 올바른 형식으로 입력해주세요. (예: 3-1, 3학년, 전체)' }
  }

  // 공통 저장 로직
  const handleSave = async (saveFunction, type) => {
    const scope = parseTargetScope(targetInput)
    if (!scope || scope.error) {
      setMessage(scope?.error ?? '❌ 대상을 확인해주세요.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { classes, label } = scope
      if (!classes || classes.length === 0) {
        setMessage('❌ 저장할 학급이 없습니다.')
        setLoading(false)
        return
      }

      let successCount = 0
      for (const classInfo of classes) {
        try {
          await saveFunction(classInfo)
          successCount++
        } catch (updateError) {
          // 기존 데이터가 없을 경우 생성 시도
          try {
            await createLearningGuide(classInfo, content, additionalContent)
            successCount++
          } catch (createError) {
            console.error(`${classInfo} 저장/생성 실패:`, createError)
          }
        }
      }

      if (successCount === classes.length) {
        setMessage(`✅ ${label}에 ${type} 저장 완료! (${classes.join(', ')})`)
        if (type === '통합') {
          setTargetInput('')
          setContent('')
          setAdditionalContent('')
        }
      } else {
        setMessage(`⚠️ ${label} 중 ${successCount}/${classes.length}개 반에만 저장되었습니다.`)
      }
    } catch (error) {
      console.error(`${type} 저장 오류:`, error)
      setMessage(`❌ ${type} 저장 중 오류: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 핸들러
  const handleSaveContent = () => handleSave(async (classInfo) => updateLearningGuideContent(classInfo, content), '학습안내')
  const handleSaveAdditionalContent = () => handleSave(async (classInfo) => updateLearningGuideAdditionalContent(classInfo, additionalContent), '추가안내')
  const handleSaveAll = () => handleSave(async (classInfo) => updateFullLearningGuide(classInfo, content, additionalContent), '통합')

  // 학습안내 조회 핸들러
  const handleSearch = async () => {
    const scope = parseTargetScope(searchTarget)
    if (!scope || scope.error) {
      setSearchMessage(scope?.error ?? '❌ 대상을 확인해주세요.')
      setSearchResult(null)
      return
    }

    setSearchLoading(true)
    setSearchMessage('')
    setSearchResult(null)

    try {
      const { classes, label } = scope
      if (!classes || classes.length === 0) {
        setSearchMessage('❌ 조회할 학급이 없습니다.')
        setSearchLoading(false)
        return
      }

      const guides = await getLearningGuides(classes)
      const results = classes.map(classInfo => ({
        classInfo,
        guide: guides[classInfo] || null
      }))
      
      setSearchResult(results)
      if (results.every(r => !r.guide)) {
        setSearchMessage(`ℹ️ ${label}에 등록된 학습안내가 없습니다.`)
      }

    } catch (error) {
      console.error('학습안내 조회 오류:', error)
      setSearchMessage('❌ 조회 중 오류가 발생했습니다: ' + error.message)
    } finally {
      setSearchLoading(false)
    }
  }

  // 클립보드 복사 핸들러
  const handleCopyToClipboard = (text, type, classInfo) => {
    navigator.clipboard.writeText(text).then(() => {
      setMessage(`✅ ${classInfo}의 ${type}가 클립보드에 복사되었습니다.`)
      setTimeout(() => setMessage(''), 3000) // 3초 후 메시지 초기화
    }, (err) => {
      setMessage('❌ 복사에 실패했습니다.')
      console.error('클립보드 복사 실패:', err)
    })
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
        📚 학습안내
      </h2>
      <p style={{
        fontSize: '14px',
        color: '#666',
        marginBottom: '32px'
      }}>
        학습안내를 조회하거나, 새로운 내용을 입력하여 저장할 수 있습니다.
      </p>

      {/* 아코디언 UI 컨테이너 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 학습안내 조회 아코디언 */}
        <div className="accordion-item">
          <div className="accordion-header" onClick={() => setAccordions(prev => ({ ...prev, search: !prev.search }))}>
            {accordions.search ? '▼' : '▶'} 학습안내 조회
          </div>
          {accordions.search && (
            <div className="accordion-content">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <input
                  type="text"
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  placeholder="조회할 대상 입력 (예: 3-1, 3학년, 전체)"
                  style={{ flex: 1, padding: '12px 16px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '8px' }}
                />
                <button onClick={handleSearch} disabled={searchLoading} style={{ padding: '12px 24px', fontSize: '16px', fontWeight: 600, color: 'white', background: '#3498db', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                  {searchLoading ? '조회 중...' : '조회'}
                </button>
              </div>
              {searchMessage && <p style={{ color: searchMessage.startsWith('❌') ? 'red' : 'blue', textAlign: 'center', margin: '16px 0' }}>{searchMessage}</p>}
              {searchResult && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {searchResult.map(({ classInfo, guide }) => (
                    <div key={classInfo} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', background: 'white' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: 700, color: '#333', marginBottom: '12px' }}>{classInfo.replace('-', '학년 ')}반</h4>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontWeight: 600, color: '#555' }}>학습안내</label>
                          <button onClick={() => handleCopyToClipboard(guide?.content || '', '학습안내', classInfo)} style={{ fontSize: '12px', padding: '4px 8px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>복사</button>
                        </div>
                        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px', minHeight: '50px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #eee' }}>
                          {guide?.content || <span style={{ color: '#999' }}>내용 없음</span>}
                        </div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontWeight: 600, color: '#555' }}>추가안내</label>
                          <button onClick={() => handleCopyToClipboard(guide?.additional_content || '', '추가안내', classInfo)} style={{ fontSize: '12px', padding: '4px 8px', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>복사</button>
                        </div>
                        <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '4px', minHeight: '50px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid #eee' }}>
                          {guide?.additional_content || <span style={{ color: '#999' }}>내용 없음</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 학습안내 입력 아코디언 */}
        <div className="accordion-item">
          <div className="accordion-header" onClick={() => setAccordions(prev => ({ ...prev, input: !prev.input }))}>
            {accordions.input ? '▼' : '▶'} 학습안내
          </div>
          {accordions.input && (
            <div className="accordion-content">
              <form onSubmit={(e) => e.preventDefault()}>
        {/* 대상 입력 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            대상 입력
          </label>
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="예: 3-1, 3학년, 전체"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #E0E0E0',
              borderRadius: '8px',
              outline: 'none',
              background: 'white'
            }}
          />
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

        {/* 추가안내 내용 */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: 600,
            color: '#333',
            marginBottom: '8px'
          }}>
            추가안내 내용 (선택사항)
          </label>
          <textarea
            value={additionalContent}
            onChange={(e) => setAdditionalContent(e.target.value)}
            placeholder="추가안내 내용을 입력하세요. 학생이 카드를 클릭하면 뒷면에 표시됩니다."
            style={{
              width: '100%',
              minHeight: '150px',
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
            💡 추가안내에 입력된 URL도 링크로 자동 변환됩니다.
          </p>
        </div>

        {/* 제출 버튼 그룹 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSaveContent} disabled={loading || !content.trim()} className="save-button content-save">
            학습안내만 저장
          </button>
          <button onClick={handleSaveAdditionalContent} disabled={loading || !additionalContent.trim()} className="save-button additional-save">
            추가안내만 저장
          </button>
          <button onClick={handleSaveAll} disabled={loading || (!content.trim() && !additionalContent.trim())} className="save-button all-save">
            통합 저장
          </button>
        </div>

        <style>{`
          .save-button {
            flex: 1;
            padding: 16px;
            font-size: 16px;
            font-weight: 600;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s, opacity 0.2s;
          }
          .save-button:disabled {
            background: #ccc;
            cursor: not-allowed;
            opacity: 0.7;
          }
          .content-save { background: #3498db; }
          .content-save:hover:not(:disabled) { background: #2980b9; }
          .additional-save { background: #2ecc71; }
          .additional-save:hover:not(:disabled) { background: #27ae60; }
          .all-save { background: #8e44ad; }
          .all-save:hover:not(:disabled) { background: #732d91; }
        `}</style>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* 아코디언 스타일 */}
      <style>{`
        .accordion-item {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }
        .accordion-header {
          background: #f7f7f7;
          padding: 16px 20px;
          cursor: pointer;
          font-weight: 600;
          color: #333;
          border-bottom: 1px solid #e0e0e0;
        }
        .accordion-header:hover {
          background: #f0f0f0;
        }
        .accordion-content {
          padding: 24px;
          background: #ffffff;
        }
      `}</style>

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
          <li>대상을 입력합니다 (예: 3-1, 3학년, 전체)</li>
          <li>학습안내 내용을 입력합니다</li>
          <li>"학습안내 저장" 버튼을 클릭합니다</li>
          <li>지정된 학급(들)에 동일한 내용이 저장됩니다</li>
          <li>학생 페이지에서 30초마다 자동으로 업데이트됩니다</li>
        </ol>
      </div>
    </div>
  )
}

export default AdminLearningGuideTab
