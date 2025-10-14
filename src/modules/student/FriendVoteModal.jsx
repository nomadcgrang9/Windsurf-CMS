import { useState, useEffect, useRef } from 'react'
import { X, Users, Heart, Zap, Award } from 'lucide-react'
import { getClassStudents } from '../../services/studentService'
import { parseStudentId } from '../../utils/formatUtils'
import { submitVote } from '../../services/voteService'
import CustomSelect from './CustomSelect'
import styles from './FriendVoteModal.module.css'

/**
 * 친구 투표 모달
 * - 3개 카테고리별로 친구 선택
 * - 중복 선택 불가
 * - 자기 자신 선택 불가
 */
function FriendVoteModal({ session, onClose, onVoteComplete }) {
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState({
    category1: null,
    category2: null,
    category3: null
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const myStudentId = localStorage.getItem('studentId')

  // 학생 목록 불러오기
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { grade, classNumber } = parseStudentId(myStudentId)
        const classInfo = `${grade}-${classNumber}`
        const studentList = await getClassStudents(classInfo)
        setStudents(studentList)
      } catch (error) {
        console.error('학생 목록 조회 오류:', error)
        alert('학생 목록을 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [myStudentId])

  // 선택 가능한 학생 필터링
  const getAvailableStudents = (currentCategory) => {
    return students.filter(student => {
      // 자기 자신 제외
      if (student.student_id === myStudentId) return false
      
      // 다른 카테고리에서 이미 선택된 학생 제외
      const alreadySelected = Object.entries(selectedStudents)
        .filter(([cat, id]) => cat !== currentCategory && id !== null)
        .map(([_, id]) => id)
      
      if (alreadySelected.includes(student.student_id)) return false
      
      return true
    })
  }

  // 학생 선택
  const handleSelectStudent = (category, studentId) => {
    setSelectedStudents(prev => ({
      ...prev,
      [category]: studentId
    }))
  }

  // 투표 제출
  const handleSubmit = async () => {
    // 모든 항목 선택 확인
    if (!selectedStudents.category1 || !selectedStudents.category2 || !selectedStudents.category3) {
      alert('모든 항목을 선택해주세요.')
      return
    }

    // 중복 체크
    const ids = [selectedStudents.category1, selectedStudents.category2, selectedStudents.category3]
    const uniqueIds = new Set(ids)
    if (uniqueIds.size !== 3) {
      alert('같은 친구를 중복 선택할 수 없습니다.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await submitVote(
        session.id,
        myStudentId,
        selectedStudents.category1,
        selectedStudents.category2,
        selectedStudents.category3
      )
      
      if (error) throw error
      
      // 임시: 2초 후 완료
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert('투표가 완료되었습니다!')
      onVoteComplete()
    } catch (error) {
      console.error('투표 제출 오류:', error)
      alert(error.message || '투표 제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // 카테고리 아이콘
  const getCategoryIcon = (category) => {
    switch(category) {
      case 1: return <Heart size={20} color="#E76F51" />
      case 2: return <Zap size={20} color="#F4A261" />
      case 3: return <Award size={20} color="#2A9D8F" />
      default: return null
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <Users size={24} color="#333" />
            <h2>친구 투표하기</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} color="#666" />
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>불러오는 중...</div>
        ) : (
          <>
            {/* 투표 항목 */}
            <div className={styles.voteItems}>
              {/* 카테고리 1 */}
              <div className={styles.voteItem}>
                <div className={styles.categoryHeader}>
                  {getCategoryIcon(1)}
                  <span className={styles.categoryTitle}>
                    {session?.question_1 || '내 말을 경청하고 친절하게 대해준 친구'}
                  </span>
                </div>
                <CustomSelect
                  options={[
                    { value: '', label: '친구를 선택하세요' },
                    ...getAvailableStudents('category1').map(student => ({
                      value: student.student_id,
                      label: student.name
                    }))
                  ]}
                  value={selectedStudents.category1 || ''}
                  onChange={(value) => handleSelectStudent('category1', value)}
                  placeholder="친구를 선택하세요"
                />
              </div>

              {/* 카테고리 2 */}
              <div className={styles.voteItem}>
                <div className={styles.categoryHeader}>
                  {getCategoryIcon(2)}
                  <span className={styles.categoryTitle}>
                    {session?.question_2 || '잘은 못해도 열심히 노력한 친구'}
                  </span>
                </div>
                <CustomSelect
                  options={[
                    { value: '', label: '친구를 선택하세요' },
                    ...getAvailableStudents('category2').map(student => ({
                      value: student.student_id,
                      label: student.name
                    }))
                  ]}
                  value={selectedStudents.category2 || ''}
                  onChange={(value) => handleSelectStudent('category2', value)}
                  placeholder="친구를 선택하세요"
                />
              </div>

              {/* 카테고리 3 */}
              <div className={styles.voteItem}>
                <div className={styles.categoryHeader}>
                  {getCategoryIcon(3)}
                  <span className={styles.categoryTitle}>
                    {session?.question_3 || '자신감 있게 말하고 실력이 뛰어난 친구'}
                  </span>
                </div>
                <CustomSelect
                  options={[
                    { value: '', label: '친구를 선택하세요' },
                    ...getAvailableStudents('category3').map(student => ({
                      value: student.student_id,
                      label: student.name
                    }))
                  ]}
                  value={selectedStudents.category3 || ''}
                  onChange={(value) => handleSelectStudent('category3', value)}
                  placeholder="친구를 선택하세요"
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className={styles.buttonGroup}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? '제출 중...' : '투표하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FriendVoteModal
