import { supabase } from '@/core/supabase/client'
import type { AttachmentVM } from '@/features/attachments/attachments.types'

interface AttachmentRow {
  id: string
  file_name: string
  size_bytes: number | null
  storage_path: string
  created_at: string
  profiles: { full_name: string } | null
}

const BUCKET = 'attachments'

function safeName(name: string): string {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 120)
}

export const attachmentRepository = {
  async list(billId: string): Promise<AttachmentVM[]> {
    const { data, error } = await supabase
      .from('attachments')
      .select('id, file_name, size_bytes, storage_path, created_at, profiles!uploaded_by(full_name)')
      .eq('owner_type', 'bill')
      .eq('owner_id', billId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data as unknown as AttachmentRow[]).map((r) => ({
      id: r.id,
      fileName: r.file_name,
      sizeBytes: r.size_bytes,
      storagePath: r.storage_path,
      uploadedByName: r.profiles?.full_name ?? null,
      createdAt: r.created_at,
    }))
  },

  async upload(billId: string, file: File): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) throw new Error('not signed in')
    const path = `bill/${billId}/${crypto.randomUUID()}-${safeName(file.name)}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (upErr) throw upErr
    const { error: insErr } = await supabase.from('attachments').insert({
      owner_type: 'bill',
      owner_id: billId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: uid,
    })
    if (insErr) throw insErr
  },

  async signedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
    if (error || !data) throw error ?? new Error('could not sign url')
    return data.signedUrl
  },

  async remove(id: string, path: string): Promise<void> {
    const { error: rmErr } = await supabase.storage.from(BUCKET).remove([path])
    if (rmErr) throw rmErr
    const { error: updErr } = await supabase
      .from('attachments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (updErr) throw updErr
  },
}
