/* ═══════════════════════════════════════════════════════════════
   MIGRATION — MULTI-ADMIN / MULTI-FOTOGRAFER
   Jalankan SQL ini di Supabase Dashboard → SQL Editor
   ═══════════════════════════════════════════════════════════════ */

-- 1. Tabel akun fotografer/admin
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name          text,
  whatsapp      text,
  created_at    timestamptz DEFAULT now()
);

-- 2. Tambah kolom pemilik sesi (foreign key ke users.id)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS photographer_id uuid REFERENCES users(id);

-- 3. Index agar query per fotografer cepat
CREATE INDEX IF NOT EXISTS idx_sessions_photographer_id ON sessions(photographer_id);

-- 4. (Opsional) Jika RLS aktif, tambahkan policy lalu lintas sesuai kebutuhan
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;