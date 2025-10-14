import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './CustomSelect.module.css'

/**
 * 커스텀 드롭다운 (다현체 폰트 완벽 적용)
 */
function CustomSelect({ options, value, onChange, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // 선택된 옵션 찾기
  const selectedOption = options.find(opt => opt.value === value)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (option) => {
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div className={styles.customSelect} ref={dropdownRef}>
      {/* 선택된 값 표시 */}
      <div 
        className={styles.selectTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? styles.selectedText : styles.placeholderText}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={20} 
          color="#666" 
          className={isOpen ? styles.iconRotated : ''}
        />
      </div>

      {/* 드롭다운 옵션 리스트 */}
      {isOpen && (
        <div className={styles.optionsList}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.option} ${option.value === value ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
