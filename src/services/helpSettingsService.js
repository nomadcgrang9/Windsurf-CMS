import { supabase } from './supabaseClient'

/**
 * 도움 설정 서비스
 * - help_settings 테이블 CRUD
 * - 학급별/학년별/전체 설정 관리
 * - 우선순위: 개별 학급 → 학년 전체 → 전체 → 하드코딩 기본값
 */

// 하드코딩 기본값 (DB 조회 실패 시 폴백)
const DEFAULT_SETTINGS = {
  cooldown_seconds: 600,  // 10분 = 600초
  daily_limit: 3
}

/**
 * 특정 학급의 설정 조회 (우선순위 적용)
 * 우선순위: 개별 학급 → 학년 전체 → 전체 → 하드코딩 기본값
 *
 * @param {number} grade - 학년
 * @param {number} classNumber - 반
 * @returns {Promise<{cooldown_seconds: number, daily_limit: number}>}
 */
export async function getHelpSettings(grade, classNumber) {
  try {
    // 1. 개별 학급 설정 확인
    const { data: classSettings, error: classError } = await supabase
      .from('help_settings')
      .select('cooldown_seconds, daily_limit')
      .eq('grade', grade)
      .eq('class_number', classNumber)
      .single()

    if (!classError && classSettings) {
      console.log(`🎯 [HelpSettings] ${grade}-${classNumber} 개별 설정 사용:`, classSettings)
      return classSettings
    }

    // 2. 학년 전체 설정 확인 (class_number = 0)
    const { data: gradeSettings, error: gradeError } = await supabase
      .from('help_settings')
      .select('cooldown_seconds, daily_limit')
      .eq('grade', grade)
      .eq('class_number', 0)
      .single()

    if (!gradeError && gradeSettings) {
      console.log(`🎯 [HelpSettings] ${grade}학년 전체 설정 사용:`, gradeSettings)
      return gradeSettings
    }

    // 3. 전체 설정 확인 (grade = 0, class_number = 0)
    const { data: globalSettings, error: globalError } = await supabase
      .from('help_settings')
      .select('cooldown_seconds, daily_limit')
      .eq('grade', 0)
      .eq('class_number', 0)
      .single()

    if (!globalError && globalSettings) {
      console.log(`🎯 [HelpSettings] 전체 설정 사용:`, globalSettings)
      return globalSettings
    }

    // 4. 모두 실패 시 하드코딩 기본값
    console.log(`🎯 [HelpSettings] 기본값 사용:`, DEFAULT_SETTINGS)
    return DEFAULT_SETTINGS

  } catch (error) {
    console.error('❌ [HelpSettings] 설정 조회 오류:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * 학생 ID로 해당 학생의 설정 조회
 * students 테이블에서 학년/반 정보를 가져와 설정 조회
 *
 * @param {string} studentId - 학생 UUID
 * @returns {Promise<{cooldown_seconds: number, daily_limit: number}>}
 */
export async function getHelpSettingsByStudentId(studentId) {
  try {
    // 학생의 학년/반 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('grade, class_number')
      .eq('student_id', studentId)
      .single()

    if (studentError || !student) {
      console.error('❌ [HelpSettings] 학생 정보 조회 실패:', studentError)
      return DEFAULT_SETTINGS
    }

    // 해당 학급의 설정 조회
    return await getHelpSettings(student.grade, student.class_number)

  } catch (error) {
    console.error('❌ [HelpSettings] 학생별 설정 조회 오류:', error)
    return DEFAULT_SETTINGS
  }
}

/**
 * 설정 조회 (관리자용)
 * - '전체': 모든 학급의 설정
 * - '3학년': 특정 학년의 모든 학급 설정
 * - '3-1': 특정 학급의 설정
 *
 * @param {string} scope - '전체', 'N학년', 'N-M' 형태
 * @returns {Promise<Array>}
 */
export async function getSettingsByScope(scope) {
  try {
    const parsed = parseScope(scope)

    if (parsed.type === 'all') {
      // 전체: 모든 설정 + students 테이블에서 실제 존재하는 학급 목록
      return await getAllClassesWithSettings()
    }
    else if (parsed.type === 'grade') {
      // 학년: 해당 학년의 모든 학급
      return await getGradeClassesWithSettings(parsed.grade)
    }
    else if (parsed.type === 'class') {
      // 개별 학급
      return await getClassWithSettings(parsed.grade, parsed.classNumber)
    }

    return []
  } catch (error) {
    console.error('❌ [HelpSettings] 범위별 조회 오류:', error)
    return []
  }
}

/**
 * 범위 문자열 파싱
 * @param {string} scope
 * @returns {{type: 'all'|'grade'|'class', grade?: number, classNumber?: number}}
 */
function parseScope(scope) {
  const trimmed = scope.trim()

  if (trimmed === '전체') {
    return { type: 'all' }
  }

  // 'N학년' 형태
  const gradeMatch = trimmed.match(/^(\d+)학년$/)
  if (gradeMatch) {
    return { type: 'grade', grade: parseInt(gradeMatch[1]) }
  }

  // 'N-M' 형태
  const classMatch = trimmed.match(/^(\d+)-(\d+)$/)
  if (classMatch) {
    return {
      type: 'class',
      grade: parseInt(classMatch[1]),
      classNumber: parseInt(classMatch[2])
    }
  }

  return { type: 'all' }
}

/**
 * 모든 학급의 설정 조회 (실제 존재하는 학급 기준)
 */
async function getAllClassesWithSettings() {
  // 1. students 테이블에서 실제 존재하는 학급 목록 조회
  const { data: classes, error: classError } = await supabase
    .from('students')
    .select('grade, class_number')

  if (classError) {
    console.error('❌ 학급 목록 조회 오류:', classError)
    return []
  }

  // 중복 제거
  const uniqueClasses = [...new Map(
    classes.map(c => [`${c.grade}-${c.class_number}`, c])
  ).values()]

  // 2. help_settings 테이블에서 모든 설정 조회
  const { data: settings } = await supabase
    .from('help_settings')
    .select('*')

  // 3. 각 학급에 설정 매칭 (우선순위 적용)
  return uniqueClasses.map(cls => {
    const setting = findSettingForClass(settings || [], cls.grade, cls.class_number)
    return {
      grade: cls.grade,
      class_number: cls.class_number,
      cooldown_seconds: setting?.cooldown_seconds ?? DEFAULT_SETTINGS.cooldown_seconds,
      daily_limit: setting?.daily_limit ?? DEFAULT_SETTINGS.daily_limit,
      setting_type: setting?.setting_type || 'default'  // 'individual', 'grade', 'global', 'default'
    }
  }).sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade
    return a.class_number - b.class_number
  })
}

/**
 * 특정 학년의 모든 학급 설정 조회
 */
async function getGradeClassesWithSettings(grade) {
  // 1. 해당 학년의 실제 학급 목록
  const { data: classes, error: classError } = await supabase
    .from('students')
    .select('grade, class_number')
    .eq('grade', grade)

  if (classError) {
    console.error('❌ 학급 목록 조회 오류:', classError)
    return []
  }

  // 중복 제거
  const uniqueClasses = [...new Map(
    classes.map(c => [`${c.grade}-${c.class_number}`, c])
  ).values()]

  // 2. help_settings에서 해당 학년 관련 설정 조회
  const { data: settings } = await supabase
    .from('help_settings')
    .select('*')
    .or(`grade.eq.${grade},grade.eq.0`)

  // 3. 각 학급에 설정 매칭
  return uniqueClasses.map(cls => {
    const setting = findSettingForClass(settings || [], cls.grade, cls.class_number)
    return {
      grade: cls.grade,
      class_number: cls.class_number,
      cooldown_seconds: setting?.cooldown_seconds ?? DEFAULT_SETTINGS.cooldown_seconds,
      daily_limit: setting?.daily_limit ?? DEFAULT_SETTINGS.daily_limit,
      setting_type: setting?.setting_type || 'default'
    }
  }).sort((a, b) => a.class_number - b.class_number)
}

/**
 * 특정 학급의 설정 조회
 */
async function getClassWithSettings(grade, classNumber) {
  // 해당 학급 관련 설정 조회
  const { data: settings } = await supabase
    .from('help_settings')
    .select('*')
    .or(`and(grade.eq.${grade},class_number.eq.${classNumber}),and(grade.eq.${grade},class_number.eq.0),and(grade.eq.0,class_number.eq.0)`)

  const setting = findSettingForClass(settings || [], grade, classNumber)

  return [{
    grade,
    class_number: classNumber,
    cooldown_seconds: setting?.cooldown_seconds ?? DEFAULT_SETTINGS.cooldown_seconds,
    daily_limit: setting?.daily_limit ?? DEFAULT_SETTINGS.daily_limit,
    setting_type: setting?.setting_type || 'default'
  }]
}

/**
 * 설정 목록에서 특정 학급에 적용될 설정 찾기 (우선순위 적용)
 */
function findSettingForClass(settings, grade, classNumber) {
  // 1. 개별 학급 설정
  const individual = settings.find(s => s.grade === grade && s.class_number === classNumber)
  if (individual) {
    return { ...individual, setting_type: 'individual' }
  }

  // 2. 학년 전체 설정
  const gradeSetting = settings.find(s => s.grade === grade && s.class_number === 0)
  if (gradeSetting) {
    return { ...gradeSetting, setting_type: 'grade' }
  }

  // 3. 전체 설정
  const global = settings.find(s => s.grade === 0 && s.class_number === 0)
  if (global) {
    return { ...global, setting_type: 'global' }
  }

  return null
}

/**
 * 개별 학급 설정 저장/업데이트
 *
 * @param {number} grade - 학년
 * @param {number} classNumber - 반
 * @param {number} cooldownSeconds - 쿨타임 (초)
 * @param {number} dailyLimit - 일일 제한
 */
export async function saveClassSetting(grade, classNumber, cooldownSeconds, dailyLimit) {
  try {
    const { data, error } = await supabase
      .from('help_settings')
      .upsert({
        grade,
        class_number: classNumber,
        cooldown_seconds: cooldownSeconds,
        daily_limit: dailyLimit
      }, {
        onConflict: 'grade,class_number'
      })
      .select()

    if (error) {
      console.error('❌ [HelpSettings] 저장 오류:', error)
      throw error
    }

    console.log(`✅ [HelpSettings] ${grade}-${classNumber} 설정 저장 완료:`, { cooldownSeconds, dailyLimit })
    return { success: true, data }

  } catch (error) {
    console.error('❌ [HelpSettings] 저장 실패:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 일괄 설정 적용
 *
 * @param {Array<{grade: number, class_number: number}>} classes - 대상 학급 목록
 * @param {number} cooldownSeconds - 쿨타임 (초)
 * @param {number} dailyLimit - 일일 제한
 */
export async function saveBatchSettings(classes, cooldownSeconds, dailyLimit) {
  try {
    const upsertData = classes.map(cls => ({
      grade: cls.grade,
      class_number: cls.class_number,
      cooldown_seconds: cooldownSeconds,
      daily_limit: dailyLimit
    }))

    const { data, error } = await supabase
      .from('help_settings')
      .upsert(upsertData, {
        onConflict: 'grade,class_number'
      })
      .select()

    if (error) {
      console.error('❌ [HelpSettings] 일괄 저장 오류:', error)
      throw error
    }

    console.log(`✅ [HelpSettings] ${classes.length}개 학급 일괄 저장 완료`)
    return { success: true, data, count: classes.length }

  } catch (error) {
    console.error('❌ [HelpSettings] 일괄 저장 실패:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 설정 삭제 (개별 학급 설정을 제거하여 상위 설정 적용)
 *
 * @param {number} grade - 학년
 * @param {number} classNumber - 반
 */
export async function deleteClassSetting(grade, classNumber) {
  try {
    // 전체 설정(0-0)은 삭제 불가
    if (grade === 0 && classNumber === 0) {
      return { success: false, error: '전체 설정은 삭제할 수 없습니다.' }
    }

    const { error } = await supabase
      .from('help_settings')
      .delete()
      .eq('grade', grade)
      .eq('class_number', classNumber)

    if (error) {
      throw error
    }

    console.log(`✅ [HelpSettings] ${grade}-${classNumber} 설정 삭제 완료`)
    return { success: true }

  } catch (error) {
    console.error('❌ [HelpSettings] 삭제 실패:', error)
    return { success: false, error: error.message }
  }
}

// 기본값 export (테스트 및 폴백용)
export { DEFAULT_SETTINGS }
