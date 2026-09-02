import { supabase } from '@/core/supabase/client'
import type { CommentVM } from '@/features/comments/comments.types'

interface CommentRow {
  id: string
  body: string
  created_at: string
  author_id: string
  profiles: { full_name: string; user_types: { key: string } | null } | null
}

const STAFF_KEYS = ['admin_member', 'employee']

export const commentRepository = {
  async list(billId: string): Promise<CommentVM[]> {
    const { data, error } = await supabase
      .from('bill_comments')
      .select('id, body, created_at, author_id, profiles!author_id(full_name, user_types(key))')
      .eq('bill_id', billId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data as unknown as CommentRow[]).map((r) => ({
      id: r.id,
      authorName: r.profiles?.full_name ?? 'Unknown',
      authorIsStaff: STAFF_KEYS.includes(r.profiles?.user_types?.key ?? ''),
      body: r.body,
      createdAt: r.created_at,
    }))
  },

  async add(billId: string, body: string): Promise<void> {
    const { data: userData } = await supabase.auth.getUser()
    const authorId = userData.user?.id
    if (!authorId) throw new Error('not signed in')
    const { error } = await supabase
      .from('bill_comments')
      .insert({ bill_id: billId, author_id: authorId, body })
    if (error) throw error
  },
}
