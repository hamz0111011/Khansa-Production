/* ═══════════════════════════════════════════════════════════════
   SERVER — Express.js API untuk Aplikasi Fotografer
   Port: 3001
═══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const supabase      = require('./lib/supabase');
const { hashPassword, verifyPassword, signToken, verifyToken, requireAuth, ensureDefaultAdmin } = require('./lib/auth');
const sessionsRouter = require('./routes/sessions');
const driveRouter    = require('./routes/drive');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());

app.use('/api/sessions', sessionsRouter);
app.use('/api/drive', driveRouter);

// ── Auth: Login ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const token = signToken({ uid: user.id, uname: user.username });
    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, whatsapp: user.whatsapp },
    });
  } catch (err) {
    console.error('[POST /auth/login]', err.message);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
});

// ── Auth: Register ───────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name, whatsapp } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi' });
    }
    if (username.trim().length < 3) {
      return res.status(400).json({ message: 'Username minimal 3 karakter' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }
    const { error } = await supabase.from('users').insert({
      username: username.trim(),
      password_hash: hashPassword(password),
      name: name || username.trim(),
      whatsapp: whatsapp || null,
    });
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Username sudah digunakan' });
      }
      throw error;
    }
    res.status(201).json({ success: true, message: 'Akun berhasil dibuat! Silakan login.' });
  } catch (err) {
    console.error('[POST /auth/register]', err.message);
    res.status(500).json({ message: 'Gagal membuat akun' });
  }
});

// ── Auth: Verify token ───────────────────────────────────────
app.post('/api/auth/verify', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ valid: false });

    const { data: user } = await supabase
      .from('users')
      .select('id, username, name, whatsapp')
      .eq('id', payload.uid)
      .single();

    if (!user) return res.status(401).json({ valid: false });

    res.json({ valid: true, user });
  } catch {
    res.json({ valid: true, user: null });
  }
});

// ── Auth: Get current user ───────────────────────────────────
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, username, name, whatsapp')
      .eq('id', req.user.uid)
      .single();
    if (!user) return res.status(404).json({ message: 'Akun tidak ditemukan' });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Gagal mengambil data user' });
  }
});

// ── Auth: Change password ────────────────────────────────────
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Password lama dan baru wajib diisi' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password baru minimal 6 karakter' });
    }

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.uid)
      .single();

    if (fetchErr || !user) return res.status(404).json({ message: 'Akun tidak ditemukan' });
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ message: 'Password saat ini salah' });
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', user.id);

    if (updateErr) throw updateErr;
    res.json({ success: true, message: 'Password berhasil diubah' });
  } catch (err) {
    console.error('[POST /auth/change-password]', err.message);
    res.status(500).json({ message: 'Gagal mengubah password' });
  }
});

// ── Health ───────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Start ────────────────────────────────────────────────────
(async () => {
  await ensureDefaultAdmin();
  app.listen(PORT, () => {
    console.log(`\n🚀 Server berjalan di http://localhost:${PORT}`);
    console.log(`📋 API tersedia di http://localhost:${PORT}/api`);
    console.log(`👤 Login pertama: username "${process.env.ADMIN_USERNAME || 'admin'}" / password dari .env\n`);
  });
})();
