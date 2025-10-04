import { supabase } from './supabaseClient'
import { getTodayKST } from '../utils/timeUtils'

/**
 * 포인트 서비스
 * - daily_points 테이블 CRUD
 * - 일일 포인트 조회/업데이트
 * - 자정 초기화 로직
 */

/**
 * 학생의 오늘 포인트 조회
 * @param {string} studentId - 학번 (예: "3101")
 * @returns {Promise<{current_points: number, max_points: number, date: string} | null>}
 * 
 * 예시:
 * const points = await getDailyPoints("3101")
 * console.log(points.current_points) // 7
 */
export const getDailyPoints = async (studentId) => {
  try {
    const today = getTodayKST() // YYYY-MM-DD 형식

    const { data, error } = await supabase
      .from('daily_points')
      .select('current_points, max_points, date')
      .eq('student_id', studentId)
      .eq('date', today)
      .single()

    if (error) {
      // 오늘 데이터가 없으면 자동 생성
      if (error.code === 'PGRST116') {
        return await createDailyPoints(studentId)
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ 포인트 조회 실패:', error.message)
    throw error
  }
}

/**
 * 오늘의 포인트 생성 (자동 초기화)
 * @param {string} studentId - 학번
 * @returns {Promise<Object>} 생성된 포인트 데이터
 */
export const createDailyPoints = async (studentId) => {
  try {
    const today = getTodayKST()

    const { data, error } = await supabase
      .from('daily_points')
      .insert([
        {
          student_id: studentId,
          date: today,
          current_points: 0,
          max_points: 20
        }
      ])
      .select()
      .single()

    if (error) {
      // 중복 키 에러 (이미 데이터가 존재) → 기존 데이터 조회
      if (error.code === '23505') {
        console.log('⚠️ 이미 존재하는 포인트 데이터, 기존 데이터 조회')
        const { data: existingData, error: fetchError } = await supabase
          .from('daily_points')
          .select('current_points, max_points, date')
          .eq('student_id', studentId)
          .eq('date', today)
          .single()

        if (fetchError) throw fetchError
        return existingData
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ 포인트 생성 실패:', error.message)
    throw error
  }
}

/**
 * 포인트 업데이트
 * @param {string} studentId - 학번
 * @param {number} points - 새로운 포인트 (0-20)
 * @returns {Promise<Object>} 업데이트된 포인트 데이터
 */
export const updateDailyPoints = async (studentId, points) => {
  try {
    const today = getTodayKST()

    // 포인트 범위 검증 (0-20)
    const validPoints = Math.max(0, Math.min(20, points))

    const { data, error } = await supabase
      .from('daily_points')
      .update({ 
        current_points: validPoints
      })
      .eq('student_id', studentId)
      .eq('date', today)
      .select()
      .single()

    if (error) {
      // 데이터가 없으면 생성 후 업데이트
      if (error.code === 'PGRST116') {
        await createDailyPoints(studentId)
        return await updateDailyPoints(studentId, points)
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('❌ 포인트 업데이트 실패:', error.message)
    throw error
  }
}

/**
 * 포인트 증가 (도움 시스템용)
 * @param {string} studentId - 학번
 * @param {number} amount - 증가량 (기본 1)
 * @returns {Promise<Object>} 업데이트된 포인트 데이터
 */
export const incrementPoints = async (studentId, amount = 1) => {
  try {
    const currentPoints = await getDailyPoints(studentId)
    const newPoints = Math.min(currentPoints.current_points + amount, 20)
    
    return await updateDailyPoints(studentId, newPoints)
  } catch (error) {
    console.error('❌ 포인트 증가 실패:', error.message)
    throw error
  }
}

/**
 * 모든 학생의 오늘 포인트 조회 (관리자용)
 * @returns {Promise<Array>} 전체 학생 포인트 목록
 */
/**
 * 특정 학급의 오늘 포인트 총합 및 목표 조회
 * @param {number} grade - 학년
 * @param {number} classNumber - 반
 * @returns {Promise<{current_points: number, goal_points: number}>}
 */
export const getTodaysClassPoints = async (grade, classNumber) => {
  try {
    const { data, error } = await supabase.rpc('get_class_daily_points_summary', {
      p_grade: grade,
      p_class_number: classNumber,
    });

    if (error) {
      console.error('❌ 우리반 포인트 조회 실패:', error.message);
      throw error;
    }

    // rpc가 결과를 찾지 못하면 빈 배열을 반환할 수 있음
    if (!data || data.length === 0) {
      return { current_points: 0, goal_points: 100 };
    }

    // rpc는 배열을 반환하므로 첫 번째 요소를 사용
    const result = data[0];
    return {
      current_points: result.current_points || 0,
      goal_points: result.goal_points || 100
    };
  } catch (error) {
    console.error('❌ 우리반 포인트 RPC 호출 실패:', error.message);
    // 실제 운영에서는 에러 처리를 더 견고하게 해야 합니다.
    return { current_points: 0, goal_points: 100 };
  }
};

/**
 * 학급 목표 포인트 업데이트 또는 생성
 * @param {number} grade - 학년
 * @param {number} classNumber - 반
 * @param {number} goalPoints - 새로운 목표 포인트
 * @returns {Promise<Object>}
 */
export const updateClassGoal = async (grade, classNumber, goalPoints) => {
  try {
    const { data, error } = await supabase
      .from('class_goals')
      .upsert(
        {
          grade: grade,
          class_number: classNumber,
          goal_points: goalPoints,
          updated_at: new Date(),
        },
        {
          onConflict: 'grade, class_number',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('❌ 목표 포인트 업데이트 실패:', error.message);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ 목표 포인트 업데이트 실패:', error.message);
    throw error;
  }
};

export const getAllDailyPoints = async () => {
  try {
    const today = getTodayKST()

    const { data, error } = await supabase
      .from('daily_points')
      .select('student_id, current_points, max_points, date')
      .eq('date', today)
      .order('student_id', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('❌ 전체 포인트 조회 실패:', error.message)
    throw error
  }
}
