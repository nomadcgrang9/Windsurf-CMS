import { supabase } from './supabaseClient'

/**
 * 학습안내 서비스
 * - learning_guide 테이블 CRUD
 * - 학급별 학습안내 조회
 */

/**
 * 학급별 최신 학습안내 조회
 * @param {string} classInfo - 학급 정보 (예: "3-1")
 * @returns {Promise<{content: string, created_at: string, updated_at: string} | null>}
 * 
 * 예시:
 * const guide = await getLearningGuide("3-1")
 * console.log(guide.content) // "오늘은 수학 3단원..."
 */
export const getLearningGuide = async (classInfo) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .select('content, additional_content, created_at, updated_at') // additional_content 추가
      .eq('class_info', classInfo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ 학습안내 조회 실패:', error.message)
    throw error
  }
}

/**
 * 학습안내 생성 (관리자용)
 * @param {string} classInfo - 학급 정보 (예: "3-1")
 * @param {string} content - 학습안내 내용
 * @returns {Promise<Object>} 생성된 학습안내
 */
export const createLearningGuide = async (classInfo, content, additionalContent) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .insert([
        {
          class_info: classInfo,
          content: content,
          additional_content: additionalContent // additional_content 추가
        }
      ])
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ 학습안내 생성 실패:', error.message)
    throw error
  }
}

/**
 * 학습안내 전체 업데이트 (관리자용)
 */
export const updateFullLearningGuide = async (classInfo, content, additionalContent) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .update({ 
        content,
        additional_content: additionalContent,
        updated_at: new Date().toISOString()
      })
      .eq('class_info', classInfo)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ 학습안내 전체 업데이트 실패:', error.message)
    throw error
  }
}

/**
 * 학습안내 '내용'만 업데이트 (관리자용)
 */
export const updateLearningGuideContent = async (classInfo, content) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('class_info', classInfo)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ 학습안내 내용 업데이트 실패:', error.message)
    throw error
  }
}

/**
 * 학습안내 '추가내용'만 업데이트 (관리자용)
 */
export const updateLearningGuideAdditionalContent = async (classInfo, additionalContent) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .update({ 
        additional_content: additionalContent,
        updated_at: new Date().toISOString()
      })
      .eq('class_info', classInfo)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('❌ 학습안내 추가내용 업데이트 실패:', error.message)
    throw error
  }
}

/**
 * 여러 학급의 학습안내 조회 (관리자용)
 * @param {string[]} classInfos - 학급 정보 배열 (예: ["3-1", "3-2"])
 * @returns {Promise<Object>} 학급 정보를 키로 하는 학습안내 객체
 */
export const getLearningGuides = async (classInfos) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .select('class_info, content, additional_content')
      .in('class_info', classInfos)

    if (error) throw error

    // 결과를 class_info를 키로 하는 객체로 변환하여 반환
    return data.reduce((acc, guide) => {
      acc[guide.class_info] = guide
      return acc
    }, {})
  } catch (error) {
    console.error('❌ 다중 학습안내 조회 실패:', error.message)
    throw error
  }
}
