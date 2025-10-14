import { supabase } from './supabaseClient'

/**
 * 친구 투표 서비스
 */

// ===== 관리자 기능 =====

/**
 * 투표 세션 시작
 */
export async function startVoteSession(question1, question2, question3) {
  try {
    // 기존 활성 세션이 있으면 종료
    const { data: activeSessions } = await supabase
      .from('vote_sessions')
      .select('id')
      .eq('status', 'active')

    if (activeSessions && activeSessions.length > 0) {
      await supabase
        .from('vote_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('status', 'active')
    }

    // 새 세션 생성
    const { data, error } = await supabase
      .from('vote_sessions')
      .insert({
        status: 'active',
        time_limit_minutes: null,
        question_1: question1,
        question_2: question2,
        question_3: question3,
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('투표 세션 시작 오류:', error)
    return { data: null, error }
  }
}

/**
 * 투표 세션 종료
 */
export async function endVoteSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('vote_sessions')
      .update({ 
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('투표 세션 종료 오류:', error)
    return { data: null, error }
  }
}

/**
 * 투표 결과 조회
 */
export async function getVoteResults(sessionId) {
  try {
    const { data, error } = await supabase
      .rpc('get_vote_results', { session_uuid: sessionId })

    if (error) throw error

    // 카테고리별로 그룹화
    const results = {
      category1: [],
      category2: [],
      category3: []
    }

    data.forEach(row => {
      const item = {
        studentId: row.student_id,
        name: row.student_name,
        votes: parseInt(row.vote_count)
      }

      if (row.category === 1) results.category1.push(item)
      else if (row.category === 2) results.category2.push(item)
      else if (row.category === 3) results.category3.push(item)
    })

    return { data: results, error: null }
  } catch (error) {
    console.error('투표 결과 조회 오류:', error)
    return { data: null, error }
  }
}

/**
 * 투표 리셋 (세션 및 투표 기록 삭제)
 */
export async function resetVote(sessionId) {
  try {
    // votes 테이블은 ON DELETE CASCADE로 자동 삭제됨
    const { error } = await supabase
      .from('vote_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('투표 리셋 오류:', error)
    return { error }
  }
}

// ===== 학생 기능 =====

/**
 * 활성 투표 세션 가져오기
 */
export async function getActiveVoteSession() {
  try {
    const { data, error } = await supabase
      .rpc('get_active_vote_session')

    if (error) throw error
    
    // 배열의 첫 번째 요소 반환 (또는 null)
    return { data: data && data.length > 0 ? data[0] : null, error: null }
  } catch (error) {
    console.error('활성 투표 세션 조회 오류:', error)
    return { data: null, error }
  }
}

/**
 * 학생 투표 제출
 */
export async function submitVote(sessionId, voterId, category1StudentId, category2StudentId, category3StudentId) {
  try {
    // 중복 투표 확인
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id')
      .eq('session_id', sessionId)
      .eq('voter_id', voterId)
      .single()

    if (existingVote) {
      // 이미 투표한 경우 업데이트
      const { data, error } = await supabase
        .from('votes')
        .update({
          category_1_student_id: category1StudentId,
          category_2_student_id: category2StudentId,
          category_3_student_id: category3StudentId
        })
        .eq('id', existingVote.id)
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } else {
      // 새로운 투표 생성
      const { data, error } = await supabase
        .from('votes')
        .insert({
          session_id: sessionId,
          voter_id: voterId,
          category_1_student_id: category1StudentId,
          category_2_student_id: category2StudentId,
          category_3_student_id: category3StudentId
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('투표 제출 오류:', error)
    return { data: null, error }
  }
}

/**
 * 학생의 투표 여부 확인
 */
export async function hasStudentVoted(sessionId, studentId) {
  try {
    const { data, error } = await supabase
      .rpc('has_student_voted', { 
        session_uuid: sessionId, 
        student_uuid: studentId 
      })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('투표 여부 확인 오류:', error)
    return { data: false, error }
  }
}

/**
 * 학생의 투표 내용 가져오기
 */
export async function getStudentVote(sessionId, studentId) {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('voter_id', studentId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
    return { data, error: null }
  } catch (error) {
    console.error('학생 투표 내용 조회 오류:', error)
    return { data: null, error }
  }
}

// ===== Realtime 구독 =====

/**
 * 투표 세션 변경 구독
 */
export function subscribeToVoteSessions(callback) {
  const channel = supabase
    .channel('vote_sessions_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vote_sessions'
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return channel
}

/**
 * 투표 기록 변경 구독
 */
export function subscribeToVotes(sessionId, callback) {
  const channel = supabase
    .channel(`votes_changes_${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `session_id=eq.${sessionId}`
      },
      (payload) => {
        callback(payload)
      }
    )
    .subscribe()

  return channel
}
