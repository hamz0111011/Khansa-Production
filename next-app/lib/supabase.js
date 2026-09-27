/* ═══════════════════════════════════════════════════════════════
   LIB/SUPABASE.JS — Singleton Supabase Client untuk Next.js
   Server-side only (API Routes)
═══════════════════════════════════════════════════════════════ */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_KEY

if (!url || !key) {
  throw new Error('SUPABASE_URL dan SUPABASE_KEY harus diisi di file .env.local')
}

const supabase = createClient(url, key)

export default supabase
