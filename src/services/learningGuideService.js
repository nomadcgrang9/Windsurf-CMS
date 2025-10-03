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
      .select('content, created_at, updated_at')
      .eq('class_info', classInfo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // 데이터가 없는 경우 null 반환
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
export const createLearningGuide = async (classInfo, content) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .insert([
        {
          class_info: classInfo,
          content: content
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
 * 학습안내 업데이트 (관리자용)
 * @param {string} classInfo - 학급 정보
 * @param {string} content - 새로운 내용
 * @returns {Promise<Object>} 업데이트된 학습안내
 */
export const updateLearningGuide = async (classInfo, content) => {
  try {
    const { data, error } = await supabase
      .from('learning_guide')
      .update({ 
        content: content,
        updated_at: new Date().toISOString()
      })
      .eq('class_info', classInfo)
      .select()
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('❌ 학습안내 업데이트 실패:', error.message)
    throw error
  }
}
