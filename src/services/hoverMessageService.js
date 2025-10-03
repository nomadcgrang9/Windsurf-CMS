import { supabase } from './supabaseClient'

const TABLE_NAME = 'hover_messages'
const RECORD_ID = 1
const STORAGE_BUCKET = 'hover-assets'

const DEFAULT_CONTENT = {
  message: '창건샘 말씀하시길, 나는 못하지만 친구는 할 수 있다!',
  imageUrl: '/characters/nini-rogin.png'
}

const parseString = (value, fallback = '') => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  return fallback
}

export const getHoverMessage = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('message, image_url')
    .eq('id', RECORD_ID)
    .single()

  if (error) {
    if (error.message?.includes('Row not found')) {
      return DEFAULT_CONTENT
    }
    throw error
  }

  return {
    message: parseString(data?.message, DEFAULT_CONTENT.message),
    imageUrl: parseString(data?.image_url, DEFAULT_CONTENT.imageUrl)
  }
}

export const updateHoverMessage = async ({ message, imageUrl }) => {
  const payload = {
    id: RECORD_ID,
    message: message?.trim() || DEFAULT_CONTENT.message,
    image_url: imageUrl || DEFAULT_CONTENT.imageUrl,
    updated_at: new Date().toISOString()
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'id' })

  if (error) {
    throw error
  }

  return {
    message: payload.message,
    imageUrl: payload.image_url
  }
}

export const uploadHoverImage = async (file) => {
  if (!file) {
    throw new Error('업로드할 파일이 없습니다.')
  }

  const fileExt = file.name.split('.').pop()
  const filePath = `hover/${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath)

  if (!publicUrlData?.publicUrl) {
    throw new Error('이미지 공개 URL을 가져올 수 없습니다.')
  }

  return publicUrlData.publicUrl
}
