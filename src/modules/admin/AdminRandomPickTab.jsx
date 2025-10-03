import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import './AdminRandomPickTab.css'

/**
 * 뽑기 관리 탭
 * - 카테고리 생성: 이름 + 아이템 목록
 * - 카테고리 수정/삭제: 기존 카테고리 편집
 */
function AdminRandomPickTab() {
  const [categories, setCategories] = useState([])
  const [expandedSection, setExpandedSection] = useState(null)
  
  // 카테고리 생성
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newItems, setNewItems] = useState([''])
  
  // 카테고리 수정
  const [editingCategory, setEditingCategory] = useState(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editItems, setEditItems] = useState([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('random_pick_categories')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setCategories(data || [])
  }

  // === 카테고리 생성 ===
  const addItem = () => {
    setNewItems([...newItems, ''])
  }

  const removeItem = (index) => {
    setNewItems(newItems.filter((_, i) => i !== index))
  }

  const updateItem = (index, value) => {
    const updated = [...newItems]
    updated[index] = value
    setNewItems(updated)
  }

  const saveCategory = async () => {
    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력하세요')
      return
    }

    const validItems = newItems.filter(item => item.trim())
    if (validItems.length === 0) {
      alert('최소 1개 이상의 아이템을 입력하세요')
      return
    }

    const { error } = await supabase
      .from('random_pick_categories')
      .insert({
        category_name: newCategoryName,
        items: validItems,
        is_active: true
      })

    if (!error) {
      alert('카테고리가 저장되었습니다')
      setNewCategoryName('')
      setNewItems([''])
      fetchCategories()
      setExpandedSection(null)
    } else {
      alert('저장 실패: ' + error.message)
    }
  }

  // === 카테고리 수정 ===
  const startEdit = (category) => {
    setEditingCategory(category)
    setEditCategoryName(category.category_name)
    setEditItems([...category.items])
    setExpandedSection('edit')
  }

  const updateEditItem = (index, value) => {
    const updated = [...editItems]
    updated[index] = value
    setEditItems(updated)
  }

  const addEditItem = () => {
    setEditItems([...editItems, ''])
  }

  const removeEditItem = (index) => {
    setEditItems(editItems.filter((_, i) => i !== index))
  }

  const saveEdit = async () => {
    if (!editCategoryName.trim()) {
      alert('카테고리 이름을 입력하세요')
      return
    }

    const validItems = editItems.filter(item => item.trim())
    if (validItems.length === 0) {
      alert('최소 1개 이상의 아이템을 입력하세요')
      return
    }

    const { error } = await supabase
      .from('random_pick_categories')
      .update({
        category_name: editCategoryName,
        items: validItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingCategory.id)

    if (!error) {
      alert('카테고리가 수정되었습니다')
      setEditingCategory(null)
      fetchCategories()
      setExpandedSection(null)
    } else {
      alert('수정 실패: ' + error.message)
    }
  }

  const deleteCategory = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('random_pick_categories')
      .delete()
      .eq('id', id)

    if (!error) {
      alert('삭제되었습니다')
      fetchCategories()
    }
  }

  const toggleActive = async (category) => {
    const { error } = await supabase
      .from('random_pick_categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id)

    if (!error) {
      fetchCategories()
    }
  }

  return (
    <div className="admin-random-pick-tab">
      <h2>🎲 뽑기 관리</h2>

      {/* 카테고리 생성 */}
      <div className="pick-section">
        <button 
          className="section-toggle"
          onClick={() => setExpandedSection(expandedSection === 'create' ? null : 'create')}
        >
          {expandedSection === 'create' ? '▼' : '▶'} 카테고리 생성
        </button>

        {expandedSection === 'create' && (
          <div className="section-content">
            <input
              type="text"
              placeholder="카테고리 이름 입력 (예: 칭찬 스티커)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="category-name-input"
            />

            <div className="items-list">
              <label>아이템 목록:</label>
              {newItems.map((item, index) => (
                <div key={index} className="item-row">
                  <input
                    type="text"
                    placeholder={`아이템 ${index + 1}`}
                    value={item}
                    onChange={(e) => updateItem(index, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addItem()
                        setTimeout(() => {
                          const inputs = document.querySelectorAll('.item-row input')
                          if (inputs[index + 1]) {
                            inputs[index + 1].focus()
                          }
                        }, 50)
                      }
                    }}
                  />
                  <button onClick={() => removeItem(index)}>X</button>
                </div>
              ))}
              <button onClick={addItem} className="add-item-btn">+ 아이템 추가</button>
            </div>

            <button onClick={saveCategory} className="save-btn">카테고리 저장</button>
          </div>
        )}
      </div>

      {/* 카테고리 수정/삭제 */}
      <div className="pick-section">
        <button 
          className="section-toggle"
          onClick={() => setExpandedSection(expandedSection === 'edit' ? null : 'edit')}
        >
          {expandedSection === 'edit' ? '▼' : '▶'} 카테고리 수정/삭제
        </button>

        {expandedSection === 'edit' && (
          <div className="section-content">
            <div className="categories-list">
              {categories.map(category => (
                <div key={category.id} className="category-card">
                  <div className="category-header">
                    <strong>{category.category_name}</strong>
                    <div className="category-actions">
                      <button onClick={() => startEdit(category)} className="edit-btn-small">수정</button>
                      <button onClick={() => deleteCategory(category.id)} className="delete-btn-small">삭제</button>
                    </div>
                  </div>
                  <div className="category-items">
                    {category.items.join(', ')}
                  </div>
                  <div className="category-status">
                    <span 
                      className={`status-indicator ${category.is_active ? 'active' : 'inactive'}`}
                      onClick={() => toggleActive(category)}
                      style={{ cursor: 'pointer' }}
                    >
                      {category.is_active ? '● 활성' : '○ 비활성'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {editingCategory && (
              <div className="edit-form">
                <h4>카테고리 수정: {editingCategory.category_name}</h4>
                <input
                  type="text"
                  placeholder="카테고리 이름"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="category-name-input"
                />

                <div className="items-list">
                  <label>아이템 목록:</label>
                  {editItems.map((item, index) => (
                    <div key={index} className="item-row">
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => updateEditItem(index, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addEditItem()
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('.edit-form .item-row input')
                              if (inputs[index + 1]) {
                                inputs[index + 1].focus()
                              }
                            }, 50)
                          }
                        }}
                      />
                      <button onClick={() => removeEditItem(index)}>X</button>
                    </div>
                  ))}
                  <button onClick={addEditItem} className="add-item-btn">+ 아이템 추가</button>
                </div>

                <div className="edit-actions">
                  <button onClick={saveEdit} className="save-btn">저장</button>
                  <button onClick={() => setEditingCategory(null)} className="cancel-btn">취소</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminRandomPickTab
