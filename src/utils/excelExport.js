import * as XLSX from 'xlsx'

/**
 * 데이터를 Excel 파일로 다운로드
 * @param {Array} data - 엑셀로 변환할 데이터 배열
 * @param {string} filename - 파일명 (확장자 제외)
 */
export function exportToExcel(data, filename) {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다')
    return
  }

  try {
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(data)

    // 워크북 생성
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    // 파일 다운로드
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const fullFilename = `${filename}_${today}.xlsx`
    
    XLSX.writeFile(workbook, fullFilename)
    
    console.log(`✅ Excel 다운로드 완료: ${fullFilename}`)
  } catch (error) {
    console.error('Excel 다운로드 오류:', error)
    alert('Excel 다운로드 중 오류가 발생했습니다')
  }
}

/**
 * 배움기록 Excel 다운로드
 * @param {Array} records - 배움기록 배열
 * @param {string} classInfo - 학급 정보 (예: "3-1")
 */
export function exportLearningRecords(records, classInfo) {
  const data = records
    .filter(r => r.ai_converted_record) // AI 변환된 기록만
    .map((record, index) => ({
      '번호': index + 1,
      '학생명': record.student_name,
      'AI 변환 내용': record.ai_converted_record
    }))

  const filename = `배움기록_${classInfo.replace('-', '학년')}`
  exportToExcel(data, filename)
}

/**
 * 도움내용 Excel 다운로드
 * @param {Array} records - 도움내용 배열
 * @param {string} classInfo - 학급 정보
 */
export function exportHelpRecords(records, classInfo) {
  const data = records
    .filter(r => r.ai_converted_description) // AI 변환된 기록만
    .map((record, index) => ({
      '번호': index + 1,
      '도와준 학생': record.helper?.name || '알 수 없음',
      '도움받은 학생': record.helped?.name || '알 수 없음',
      '원본 내용': record.help_description,
      'AI 변환 내용': record.ai_converted_description,
      '승인 여부': record.is_approved ? '승인' : '미승인',
      '날짜': new Date(record.transaction_time).toLocaleDateString('ko-KR')
    }))

  const filename = `도움내용_${classInfo}`
  exportToExcel(data, filename)
}
