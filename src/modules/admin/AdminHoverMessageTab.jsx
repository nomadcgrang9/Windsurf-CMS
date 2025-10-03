import { useEffect, useState } from 'react'
import {
  getHoverMessage,
  updateHoverMessage,
  uploadHoverImage
} from '../../services/hoverMessageService'
import './AdminHoverMessageTab.css'

function AdminHoverMessageTab() {
  const [message, setMessage] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true)
      setStatus('')
      try {
        const data = await getHoverMessage()
        setMessage(data.message)
        setImageUrl(data.imageUrl)
        setPreviewUrl(data.imageUrl)
      } catch (error) {
        console.error('말풍선 데이터 로드 실패:', error)
        setStatus('❌ 데이터를 불러오지 못했습니다. 새로고침 후 다시 시도하세요.')
      } finally {
        setLoading(false)
      }
    }

    loadContent()
  }, [])

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setStatus('이미지 업로드 중입니다...')
    try {
      const publicUrl = await uploadHoverImage(file)
      setImageUrl(publicUrl)
      setPreviewUrl(publicUrl)
      setStatus('✅ 이미지가 업로드되었습니다. 저장을 눌러 반영하세요.')
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      setStatus('❌ 이미지 업로드에 실패했습니다. 파일 형식을 확인해주세요.')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!message.trim()) {
      setStatus('❌ 말풍선 내용을 입력해주세요.')
      return
    }

    setSaving(true)
    setStatus('저장 중입니다...')
    try {
      const result = await updateHoverMessage({ message, imageUrl })
      setMessage(result.message)
      setImageUrl(result.imageUrl)
      setPreviewUrl(result.imageUrl)
      setStatus('✅ 말풍선 내용이 저장되었습니다.')
    } catch (error) {
      console.error('말풍선 저장 실패:', error)
      setStatus('❌ 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="hover-tab-loading">불러오는 중...</div>
  }

  return (
    <div className="hover-tab-container">
      <h2>💬 말풍선 관리</h2>
      <form className="hover-tab-form" onSubmit={handleSubmit}>
        <label className="hover-tab-label" htmlFor="hover-message">
          말풍선 텍스트
        </label>
        <textarea
          id="hover-message"
          className="hover-tab-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="캐릭터 말풍선에 표시할 문구를 입력하세요."
        />

        <label className="hover-tab-label" htmlFor="hover-image">
          캐릭터 이미지 (선택) – JPG/PNG 권장
        </label>
        <input
          id="hover-image"
          type="file"
          accept="image/*"
          className="hover-tab-file"
          onChange={handleFileChange}
        />

        {previewUrl && (
          <div className="hover-tab-preview">
            <span className="preview-title">현재 이미지</span>
            <img src={previewUrl} alt="캐릭터 미리보기" />
          </div>
        )}

        <button type="submit" className="hover-tab-submit" disabled={saving}>
          {saving ? '저장 중...' : '말풍선 저장'}
        </button>
      </form>

      {status && <p className="hover-tab-status">{status}</p>}
    </div>
  )
}

export default AdminHoverMessageTab
