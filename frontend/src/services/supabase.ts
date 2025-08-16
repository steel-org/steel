import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface FileUploadResult {
  url: string
  path: string
  size: number
  type: string
}

export const uploadFile = async (
  file: File, 
  userId: string, 
  folder: 'avatars' | 'chat-files' = 'chat-files'
): Promise<FileUploadResult> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${folder}/${fileName}`

  const { data, error } = await supabase.storage
    .from('biuld-chat')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  const { data: { publicUrl } } = supabase.storage
    .from('biuld-chat')
    .getPublicUrl(filePath)

  return {
    url: publicUrl,
    path: filePath,
    size: file.size,
    type: file.type
  }
}

export const deleteFile = async (filePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('biuld-chat')
    .remove([filePath])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  const result = await uploadFile(file, userId, 'avatars')
  return result.url
}

export const uploadChatFile = async (file: File, userId: string): Promise<FileUploadResult> => {
  return uploadFile(file, userId, 'chat-files')
}
