import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import styles from './RoleAssignModule.module.css'

/**
 * 역할확인 모듈 - 플립카드
 * - 좌측 도구 2번
 * - 기존 tool-button 구조 유지 + 플립 기능 추가
 * - 앞면: 기존 아이콘 이미지 + 텍스트
 * - 뒷면: 배정된 역할 표시
 * - 하이브리드 방식: 플립 시에만 데이터 로드
 */
function RoleAssignModule({ isFlipped, onFlip, state, setState }) {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const studentId = localStorage.getItem('studentId')
  const studentName = localStorage.getItem('studentName')

  // 하이브리드: 플립될 때만 역할 확인
  useEffect(() => {
    if (isFlipped && studentId) {
      fetchRole()
    }
  }, [isFlipped, studentId])

  const fetchRole = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('student_roles')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setRole(data || null)
    } catch (error) {
      console.error('역할 로드 실패:', error)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCardClick = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
      e.stopPropagation()
      return
    }
    onFlip()
  }

  return (
    <div 
      className={`tool-button ${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
      onClick={handleCardClick}
    >
      {/* 앞면 - 기존 구조 유지 */}
      <div className={styles.cardFront}>
        <div className="tool-button-icon">
          <img src="/characters/role.png" alt="역할확인" className="tool-icon" />
        </div>
        <div className="tool-button-text">역할확인</div>
      </div>

      {/* 뒷면 - 역할 표시 */}
      <div className={styles.cardBack}>
        <div className={styles.backContent}>
          {loading ? (
            <div className={styles.loading}>확인 중...</div>
          ) : role ? (
            <div className={styles.roleName}>{role.role_name}</div>
          ) : (
            <div className={styles.noRole}>배정없음</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoleAssignModule
