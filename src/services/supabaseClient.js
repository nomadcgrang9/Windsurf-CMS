import { createClient } from '@supabase/supabase-js'

/**
 * Supabase 클라이언트 초기화
 * - .env 파일에서 URL과 Anon Key 로드
 * - 모든 Supabase 연동의 기본 클라이언트
 * 
 * @requires VITE_SUPABASE_URL - Supabase 프로젝트 URL
 * @requires VITE_SUPABASE_ANON_KEY - Supabase Anon/Public Key
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Supabase 환경 변수가 설정되지 않았습니다.\n' +
    '.env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정하세요.'
  )
}

/**
 * Supabase 클라이언트 인스턴스
 * - 데이터베이스 CRUD 작업
 * - Realtime 구독
 * - 인증 관리
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
