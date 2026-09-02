import { describe, it, expect } from 'vitest'

describe('env', () => {
  it('parses required VITE_SUPABASE_* vars', async () => {
    const { env } = await import('@/core/config/env')
    expect(env.supabaseUrl).toMatch(/^https?:\/\//)
    expect(env.supabaseAnonKey.length).toBeGreaterThan(10)
  })
})
