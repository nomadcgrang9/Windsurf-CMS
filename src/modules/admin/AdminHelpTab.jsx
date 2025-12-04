import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { getActiveHelpRequests, createHelpRequest, cancelHelpRequest } from '../../services/helpService'
import { getSettingsByScope, saveClassSetting, saveBatchSettings, DEFAULT_SETTINGS } from '../../services/helpSettingsService'
import './AdminHelpTab.css'

/**
 * 도움관리 탭
 * - 도움상황 리셋: 학급별/학년별/전체 리셋
 * - 도움 상태 지정: 도와줄래/도와줄게 지정 및 해제
 */
function AdminHelpTab() {
  const [accordions, setAccordions] = useState({ reset: false, assign: true, settings: false })

  // 도움상황 리셋
  const [resetInput, setResetInput] = useState('')

  // 도움 상태 지정
  const [classInput, setClassInput] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState('')

  // 도움설정
  const [settingsInput, setSettingsInput] = useState('')
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsResult, setSettingsResult] = useState(null) // { type: 'single'|'grade'|'all', label: string, classes: [] }
  const [batchCooldown, setBatchCooldown] = useState('')
  const [batchDailyLimit, setBatchDailyLimit] = useState('')
  const [expandedGrades, setExpandedGrades] = useState({}) // 학년별 펼침 상태

  // === 도움상황 리셋 ===
  const parseResetScope = (input) => {
    const trimmed = input.trim()
    
    if (trimmed === '전체') {
      return { grade: null, classNumber: null, label: '전체' }
    }
    
    if (trimmed.includes('학년')) {
      const grade = parseInt(trimmed.replace('학년', ''))
      if (isNaN(grade)) return null
      return { grade, classNumber: null, label: `${grade}학년 전체` }
    }
    
    if (trimmed.includes('-')) {
      const [grade, classNumber] = trimmed.split('-').map(Number)
      if (isNaN(grade) || isNaN(classNumber)) return null
      return { grade, classNumber, label: `${grade}학년 ${classNumber}반` }
    }
    
    return null
  }

  const handleReset = async () => {
    const scope = parseResetScope(resetInput)
    
    if (!scope) {
      alert('올바른 형식으로 입력하세요.\n예시: 3-1, 3학년, 전체')
      return
    }

    if (!confirm(`${scope.label}의 모든 도움 상태를 리셋하시겠습니까?`)) {
      return
    }

    try {
      let query = supabase
        .from('help_requests')
        .update({ is_active: false })
        .eq('is_active', true)

      if (scope.grade !== null) {
        // 학생 ID로 필터링하기 위해 먼저 학생 목록 조회
        let studentQuery = supabase
          .from('students')
          .select('student_id')
          .eq('grade', scope.grade)

        if (scope.classNumber !== null) {
          studentQuery = studentQuery.eq('class_number', scope.classNumber)
        }

        const { data: studentData, error: studentError } = await studentQuery

        if (studentError) throw studentError

        const studentIds = studentData.map(s => s.student_id)
        
        if (studentIds.length === 0) {
          alert('해당 학급에 학생이 없습니다.')
          return
        }

        query = query.in('student_id', studentIds)
      }

      const { error, count } = await query

      if (error) throw error

      alert(`✅ ${scope.label} 도움 상태가 리셋되었습니다.`)
      setResetInput('')
      
      // 현재 조회 중인 학급이 있으면 새로고침
      if (selectedClass) {
        fetchStudents(selectedClass)
      }
    } catch (error) {
      console.error('리셋 오류:', error)
      alert('리셋 중 오류가 발생했습니다.')
    }
  }

  // === 학급 조회 ===
  const fetchStudents = async (classInfo) => {
    if (!classInfo.trim()) {
      alert('학급을 입력하세요. (예: 3-1)')
      return
    }

    setLoading(true)
    try {
      const data = await getActiveHelpRequests(classInfo)
      setStudents(data)
      setSelectedClass(classInfo)
    } catch (error) {
      console.error('학급 조회 오류:', error)
      alert('학급 조회 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // === 상태 지정 ===
  const handleAssignRequesting = async (studentId) => {
    try {
      await createHelpRequest(studentId, 'requesting')
      fetchStudents(selectedClass)
    } catch (error) {
      console.error('도와줄래 지정 오류:', error)
      alert('지정 중 오류가 발생했습니다.')
    }
  }

  const handleAssignHelping = async (studentId) => {
    try {
      await createHelpRequest(studentId, 'helping')
      fetchStudents(selectedClass)
    } catch (error) {
      console.error('도와줄게 지정 오류:', error)
      alert('지정 중 오류가 발생했습니다.')
    }
  }

  const handleCancel = async (studentId) => {
    try {
      await cancelHelpRequest(studentId)
      fetchStudents(selectedClass)
    } catch (error) {
      console.error('상태 해제 오류:', error)
      alert('해제 중 오류가 발생했습니다.')
    }
  }

  // === Realtime 구독 ===
  useEffect(() => {
    if (!selectedClass) return

    const channel = supabase
      .channel('admin_help_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_requests'
        },
        () => {
          fetchStudents(selectedClass)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedClass])

  // === 도움설정 ===
  const parseSettingsScope = (input) => {
    const trimmed = input.trim()

    if (trimmed === '전체') {
      return { type: 'all', grade: null, classNumber: null, label: '전체' }
    }

    if (trimmed.includes('학년') && !trimmed.includes('-')) {
      const grade = parseInt(trimmed.replace('학년', ''))
      if (isNaN(grade)) return null
      return { type: 'grade', grade, classNumber: null, label: `${grade}학년 전체` }
    }

    if (trimmed.includes('-')) {
      const [grade, classNumber] = trimmed.split('-').map(Number)
      if (isNaN(grade) || isNaN(classNumber)) return null
      return { type: 'single', grade, classNumber, label: `${grade}학년 ${classNumber}반` }
    }

    return null
  }

  // 학급 목록 조회 (설정용) - helpSettingsService 사용
  const fetchSettingsClasses = async () => {
    const scope = parseSettingsScope(settingsInput)

    if (!scope) {
      alert('올바른 형식으로 입력하세요.\n예시: 3-1, 3학년, 전체')
      return
    }

    setSettingsLoading(true)
    try {
      // 🎯 helpSettingsService에서 설정값과 함께 학급 목록 조회
      const data = await getSettingsByScope(settingsInput)

      if (!data || data.length === 0) {
        alert('해당 조건에 맞는 학급이 없습니다.')
        setSettingsResult(null)
        return
      }

      // 데이터 형식 변환 (class_number → classNumber)
      const classes = data.map(item => ({
        grade: item.grade,
        classNumber: item.class_number,
        label: `${item.grade}-${item.class_number}`,
        cooldown_seconds: item.cooldown_seconds,
        daily_limit: item.daily_limit,
        setting_type: item.setting_type // 'individual', 'grade', 'global', 'default'
      }))

      // 학년별로 그룹핑 (전체 조회 시)
      let groupedByGrade = {}
      if (scope.type === 'all') {
        classes.forEach(cls => {
          if (!groupedByGrade[cls.grade]) {
            groupedByGrade[cls.grade] = []
          }
          groupedByGrade[cls.grade].push(cls)
        })
      }

      setSettingsResult({
        type: scope.type,
        label: scope.label,
        classes,
        groupedByGrade: scope.type === 'all' ? groupedByGrade : null
      })

      // 일괄 변경 입력값 초기화
      setBatchCooldown('')
      setBatchDailyLimit('')

    } catch (error) {
      console.error('설정 조회 오류:', error)
      alert('설정 조회 중 오류가 발생했습니다.')
    } finally {
      setSettingsLoading(false)
    }
  }

  // 개별 학급 설정 변경
  const handleClassSettingChange = (classLabel, field, value) => {
    setSettingsResult(prev => {
      if (!prev) return prev
      const updatedClasses = prev.classes.map(cls => {
        if (cls.label === classLabel) {
          return { ...cls, [field]: parseInt(value) || 0 }
        }
        return cls
      })

      // groupedByGrade도 업데이트
      let updatedGrouped = null
      if (prev.groupedByGrade) {
        updatedGrouped = {}
        updatedClasses.forEach(cls => {
          if (!updatedGrouped[cls.grade]) {
            updatedGrouped[cls.grade] = []
          }
          updatedGrouped[cls.grade].push(cls)
        })
      }

      return { ...prev, classes: updatedClasses, groupedByGrade: updatedGrouped }
    })
  }

  // 개별 학급 설정 저장 - helpSettingsService 사용
  const handleSaveClassSetting = async (classData) => {
    try {
      const result = await saveClassSetting(
        classData.grade,
        classData.classNumber,
        classData.cooldown_seconds,
        classData.daily_limit
      )

      if (result.success) {
        alert(`✅ ${classData.label} 설정이 저장되었습니다.\n쿨타임: ${formatSeconds(classData.cooldown_seconds)}\n일일한도: ${classData.daily_limit === 0 ? '무제한' : `${classData.daily_limit}회`}`)
      } else {
        alert(`❌ 저장 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('설정 저장 오류:', error)
      alert('설정 저장 중 오류가 발생했습니다.')
    }
  }

  // 일괄 적용 - helpSettingsService 사용
  const handleBatchApply = async () => {
    if (!batchCooldown && !batchDailyLimit) {
      alert('쿨타임 또는 일일한도 중 하나 이상 입력해주세요.')
      return
    }

    const cooldownValue = batchCooldown ? parseInt(batchCooldown) : null
    const dailyLimitValue = batchDailyLimit ? parseInt(batchDailyLimit) : null

    if (batchCooldown && (isNaN(cooldownValue) || cooldownValue < 0)) {
      alert('쿨타임은 0 이상의 숫자로 입력해주세요.')
      return
    }

    if (batchDailyLimit && (isNaN(dailyLimitValue) || dailyLimitValue < 0)) {
      alert('일일한도는 0 이상의 숫자로 입력해주세요.')
      return
    }

    const targetClasses = settingsResult.classes.map(c => c.label).join(', ')
    const confirmMsg = `다음 학급에 일괄 적용합니다:\n${targetClasses}\n\n${cooldownValue !== null ? `쿨타임: ${formatSeconds(cooldownValue)}\n` : ''}${dailyLimitValue !== null ? `일일한도: ${dailyLimitValue === 0 ? '무제한' : `${dailyLimitValue}회`}` : ''}\n\n적용하시겠습니까?`

    if (!confirm(confirmMsg)) return

    try {
      // 일괄 적용할 학급 목록 생성 (기존 값과 병합)
      const classesToUpdate = settingsResult.classes.map(cls => ({
        grade: cls.grade,
        class_number: cls.classNumber,
        cooldown_seconds: cooldownValue !== null ? cooldownValue : cls.cooldown_seconds,
        daily_limit: dailyLimitValue !== null ? dailyLimitValue : cls.daily_limit
      }))

      // 🎯 DB에 일괄 저장
      const result = await saveBatchSettings(
        classesToUpdate,
        cooldownValue !== null ? cooldownValue : settingsResult.classes[0]?.cooldown_seconds || DEFAULT_SETTINGS.cooldown_seconds,
        dailyLimitValue !== null ? dailyLimitValue : settingsResult.classes[0]?.daily_limit || DEFAULT_SETTINGS.daily_limit
      )

      if (result.success) {
        // 로컬 상태 업데이트
        setSettingsResult(prev => {
          if (!prev) return prev
          const updatedClasses = prev.classes.map(cls => ({
            ...cls,
            cooldown_seconds: cooldownValue !== null ? cooldownValue : cls.cooldown_seconds,
            daily_limit: dailyLimitValue !== null ? dailyLimitValue : cls.daily_limit
          }))

          let updatedGrouped = null
          if (prev.groupedByGrade) {
            updatedGrouped = {}
            updatedClasses.forEach(cls => {
              if (!updatedGrouped[cls.grade]) {
                updatedGrouped[cls.grade] = []
              }
              updatedGrouped[cls.grade].push(cls)
            })
          }

          return { ...prev, classes: updatedClasses, groupedByGrade: updatedGrouped }
        })

        alert(`✅ 일괄 적용 완료!\n대상: ${result.count}개 학급`)
        setBatchCooldown('')
        setBatchDailyLimit('')
      } else {
        alert(`❌ 일괄 적용 실패: ${result.error}`)
      }
    } catch (error) {
      console.error('일괄 적용 오류:', error)
      alert('일괄 적용 중 오류가 발생했습니다.')
    }
  }

  // 학년 펼침/접힘 토글
  const toggleGradeExpand = (grade) => {
    setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }))
  }

  // 초를 분:초 형식으로 변환 (표시용)
  const formatSeconds = (seconds) => {
    if (seconds === 0) return '0초 (없음)'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}초`
    if (secs === 0) return `${mins}분`
    return `${mins}분 ${secs}초`
  }

  return (
    <div className="admin-help-tab">
      <h2>🆘 도움관리</h2>

      {/* 도움상황 리셋 */}
      <div className="help-section">
        <button 
          className="section-toggle"
          onClick={() => setAccordions(prev => ({ ...prev, reset: !prev.reset }))}
        >
          {accordions.reset ? '▼' : '▶'} 도움상황 리셋
        </button>

        {accordions.reset && (
          <div className="section-content">
            <div className="reset-container">
              <input
                type="text"
                placeholder="학급 입력 (예: 3-1, 3학년, 전체)"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                className="reset-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleReset()
                }}
              />
              <button onClick={handleReset} className="reset-btn">리셋하기</button>
            </div>

            <div className="reset-guide">
              <p>💡 사용 예시:</p>
              <ul>
                <li><strong>3-1</strong> → 3학년 1반 리셋</li>
                <li><strong>3학년</strong> → 3학년 전체 리셋</li>
                <li><strong>전체</strong> → 모든 학급 리셋</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 도움 상태 지정 */}
      <div className="help-section">
        <button 
          className="section-toggle"
          onClick={() => setAccordions(prev => ({ ...prev, assign: !prev.assign }))}
        >
          {accordions.assign ? '▼' : '▶'} 도움 상태 지정
        </button>

        {accordions.assign && (
          <div className="section-content">
            <div className="class-select-container">
              <input
                type="text"
                placeholder="학급 선택 (예: 3-1)"
                value={classInput}
                onChange={(e) => setClassInput(e.target.value)}
                className="class-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') fetchStudents(classInput)
                }}
              />
              <button onClick={() => fetchStudents(classInput)} className="query-btn">
                조회하기
              </button>
            </div>

            {loading ? (
              <div className="loading-message">불러오는 중...</div>
            ) : students.length > 0 ? (
              <div className="students-container">
                <h3>📋 {selectedClass} 도움 현황</h3>
                <div className="students-grid">
                  {students.map((student) => (
                    <div key={student.student_id} className="student-card">
                      <div className="student-name">{student.name}</div>
                      <div className="student-status-icon">
                        {student.status === 'requesting' ? '🟠' : 
                         student.status === 'helping' ? '🔵' : '⚪'}
                      </div>
                      <div className="student-buttons">
                        <button
                          className={`btn-requesting ${student.status === 'requesting' ? 'active' : ''}`}
                          onClick={() => handleAssignRequesting(student.student_id)}
                        >
                          🟠
                        </button>
                        <button
                          className={`btn-helping ${student.status === 'helping' ? 'active' : ''}`}
                          onClick={() => handleAssignHelping(student.student_id)}
                        >
                          🔵
                        </button>
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancel(student.student_id)}
                          disabled={!student.is_active}
                        >
                          해제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 도움설정 */}
      <div className="help-section">
        <button
          className="section-toggle"
          onClick={() => setAccordions(prev => ({ ...prev, settings: !prev.settings }))}
        >
          {accordions.settings ? '▼' : '▶'} 도움설정
        </button>

        {accordions.settings && (
          <div className="section-content">
            {/* 대상 선택 */}
            <div className="settings-target-box">
              <h4>📍 대상 선택</h4>
              <div className="settings-input-row">
                <input
                  type="text"
                  placeholder="예: 3-1, 3학년, 전체"
                  value={settingsInput}
                  onChange={(e) => setSettingsInput(e.target.value)}
                  className="settings-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') fetchSettingsClasses()
                  }}
                />
                <button
                  onClick={fetchSettingsClasses}
                  className="settings-query-btn"
                  disabled={settingsLoading}
                >
                  {settingsLoading ? '조회중...' : '조회하기'}
                </button>
              </div>
              <p className="settings-hint">
                💡 입력 예시: 3-1(3학년1반), 3학년(3학년 전체), 전체
              </p>
            </div>

            {/* 조회 결과 */}
            {settingsResult && (
              <div className="settings-result-box">
                <h4>📊 조회 결과: {settingsResult.label} ({settingsResult.classes.length}개 학급)</h4>

                {/* 일괄 변경 영역 (단일 학급이 아닐 때만 표시) */}
                {settingsResult.type !== 'single' && (
                  <div className="batch-apply-box">
                    <div className="batch-apply-header">
                      <span>🔄 일괄 변경</span>
                      <span className="batch-apply-desc">
                        {settingsResult.label}에 동일하게 적용됩니다.
                      </span>
                    </div>
                    <div className="batch-apply-inputs">
                      <div className="batch-input-group">
                        <label>⏱️ 쿨타임</label>
                        <div className="batch-input-wrapper">
                          <input
                            type="number"
                            min="0"
                            placeholder=""
                            value={batchCooldown}
                            onChange={(e) => setBatchCooldown(e.target.value)}
                            className="batch-input"
                          />
                          <span className="batch-unit">초</span>
                        </div>
                      </div>
                      <div className="batch-input-group">
                        <label>📈 일일한도</label>
                        <div className="batch-input-wrapper">
                          <input
                            type="number"
                            min="0"
                            placeholder=""
                            value={batchDailyLimit}
                            onChange={(e) => setBatchDailyLimit(e.target.value)}
                            className="batch-input"
                          />
                          <span className="batch-unit">회</span>
                        </div>
                      </div>
                      <button onClick={handleBatchApply} className="batch-apply-btn">
                        일괄 적용하기
                      </button>
                    </div>
                    <p className="batch-hint">※ 0초 = 쿨타임 없음, 0회 = 무제한</p>
                  </div>
                )}

                {/* 개별 학급 설정 */}
                <div className="individual-settings-box">
                  <h5>📋 {settingsResult.type === 'single' ? '설정' : '개별 학급 설정'}</h5>

                  {/* 전체 조회 시: 학년별 아코디언 */}
                  {settingsResult.type === 'all' && settingsResult.groupedByGrade ? (
                    <div className="grade-accordion-list">
                      {Object.keys(settingsResult.groupedByGrade)
                        .sort((a, b) => parseInt(a) - parseInt(b))
                        .map(grade => (
                          <div key={grade} className="grade-accordion">
                            <button
                              className="grade-accordion-toggle"
                              onClick={() => toggleGradeExpand(grade)}
                            >
                              {expandedGrades[grade] ? '▼' : '▶'} {grade}학년 ({settingsResult.groupedByGrade[grade].length}개 학급)
                            </button>
                            {expandedGrades[grade] && (
                              <div className="grade-accordion-content">
                                <table className="settings-table">
                                  <thead>
                                    <tr>
                                      <th>학급</th>
                                      <th>⏱️ 쿨타임 (초)</th>
                                      <th>📈 일일한도 (회)</th>
                                      <th>저장</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {settingsResult.groupedByGrade[grade].map(cls => (
                                      <tr key={cls.label}>
                                        <td className="class-label-cell">{cls.label}</td>
                                        <td>
                                          <div className="table-input-wrapper">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cls.cooldown_seconds}
                                              onChange={(e) => handleClassSettingChange(cls.label, 'cooldown_seconds', e.target.value)}
                                              className="table-input"
                                            />
                                            <span className="table-format-hint">{formatSeconds(cls.cooldown_seconds)}</span>
                                          </div>
                                        </td>
                                        <td>
                                          <div className="table-input-wrapper">
                                            <input
                                              type="number"
                                              min="0"
                                              value={cls.daily_limit}
                                              onChange={(e) => handleClassSettingChange(cls.label, 'daily_limit', e.target.value)}
                                              className="table-input"
                                            />
                                            <span className="table-format-hint">{cls.daily_limit === 0 ? '무제한' : `${cls.daily_limit}회`}</span>
                                          </div>
                                        </td>
                                        <td>
                                          <button
                                            onClick={() => handleSaveClassSetting(cls)}
                                            className="table-save-btn"
                                          >
                                            저장
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    /* 단일 학급 또는 학년 조회 시: 테이블 직접 표시 */
                    <table className="settings-table">
                      <thead>
                        <tr>
                          <th>학급</th>
                          <th>⏱️ 쿨타임 (초)</th>
                          <th>📈 일일한도 (회)</th>
                          <th>저장</th>
                        </tr>
                      </thead>
                      <tbody>
                        {settingsResult.classes.map(cls => (
                          <tr key={cls.label}>
                            <td className="class-label-cell">{cls.label}</td>
                            <td>
                              <div className="table-input-wrapper">
                                <input
                                  type="number"
                                  min="0"
                                  value={cls.cooldown_seconds}
                                  onChange={(e) => handleClassSettingChange(cls.label, 'cooldown_seconds', e.target.value)}
                                  className="table-input"
                                />
                                <span className="table-format-hint">{formatSeconds(cls.cooldown_seconds)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="table-input-wrapper">
                                <input
                                  type="number"
                                  min="0"
                                  value={cls.daily_limit}
                                  onChange={(e) => handleClassSettingChange(cls.label, 'daily_limit', e.target.value)}
                                  className="table-input"
                                />
                                <span className="table-format-hint">{cls.daily_limit === 0 ? '무제한' : `${cls.daily_limit}회`}</span>
                              </div>
                            </td>
                            <td>
                              <button
                                onClick={() => handleSaveClassSetting(cls)}
                                className="table-save-btn"
                              >
                                저장
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminHelpTab
