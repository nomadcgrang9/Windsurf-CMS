import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import styles from './RandomPickModule.module.css'

/**
 * 뽑기 모듈 - 플립카드
 * - 좌측 도구 4번
 * - 기존 tool-button 구조 유지 + 플립 기능 추가
 * - 앞면: 기존 아이콘 이미지 + 텍스트
 * - 뒷면: 카테고리 선택 + 뽑기 버튼
 * - 서버 연동: 초기 로드 시 1회만
 */
function RandomPickModule({ isFlipped, onFlip, state, setState }) {
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  // 카테고리 목록 가져오기 (초기 로드 시 1회)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('random_pick_categories')
          .select('*')
          .eq('is_active', true)
          .order('id')

        if (error) throw error
        setCategories(data || [])
      } catch (error) {
        console.error('카테고리 로드 실패:', error)
      }
    }

    fetchCategories()
  }, [])

  const handlePick = (e) => {
    e.stopPropagation()
    
    if (!selectedCategory) {
      alert('카테고리를 선택해주세요')
      return
    }

    setLoading(true)

    // 선택된 카테고리 찾기
    const category = categories.find(c => c.id === parseInt(selectedCategory))
    if (!category || !category.items || category.items.length === 0) {
      alert('뽑기 아이템이 없습니다')
      setLoading(false)
      return
    }

    // 랜덤 선택 (애니메이션 효과)
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * category.items.length)
      const pickedItem = category.items[randomIndex]
      
      setResult({
        categoryName: category.category_name,
        item: pickedItem
      })
      setShowResult(true)
      setLoading(false)
    }, 500)
  }

  const handleResultClose = (e) => {
    e.stopPropagation()
    setShowResult(false)
    setResult(null)
    setSelectedCategory('')
  }

  const handleCardClick = (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
      e.stopPropagation()
      return
    }
    onFlip()
  }

  return (
    <>
      <div 
        className={`tool-button ${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`}
        onClick={handleCardClick}
      >
        {/* 앞면 - 기존 구조 유지 */}
        <div className={styles.cardFront}>
          <div className="tool-button-icon">
            <img src="/characters/pick.png" alt="뽑기" className="tool-icon" />
          </div>
          <div className="tool-button-text">뽑기</div>
        </div>

        {/* 뒷면 - 뽑기 기능 */}
        <div className={styles.cardBack}>
          <div className={styles.backContent}>
            <div className={styles.title}>뽑기</div>
            
            <select
              className={styles.select}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="" disabled hidden></option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.category_name}
                </option>
              ))}
            </select>

            <button
              className={styles.button}
              onClick={handlePick}
              disabled={!selectedCategory || loading}
            >
              {loading ? '뽑는 중...' : '뽑기'}
            </button>
          </div>
        </div>
      </div>

      {/* 결과 모달 */}
      {showResult && result && (
        <div className={styles.modal} onClick={handleResultClose}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>🎉 당첨!</div>
            <div className={styles.modalCategory}>{result.categoryName}</div>
            <div className={styles.modalResult}>{result.item}</div>
            <button className={styles.modalButton} onClick={handleResultClose}>확인</button>
          </div>
        </div>
      )}
    </>
  )
}

export default RandomPickModule
