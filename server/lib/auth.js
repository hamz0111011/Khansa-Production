const crypto  = require('crypto');
const supabase = require('./supabase');

const SCRYPT_KEYLEN = 64;
const JWT_SECRET   = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'khansa-multi-secret';
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 hari

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const parts = (stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const test = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(s, 'base64');
}

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_EXPIRY }));
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (!payload.uid) return null;
    return payload;
  } catch { return null; }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ message: 'Tidak terautentikasi. Silakan login.' });
  req.user = payload;
  next();
}

async function ensureDefaultAdmin() {
  try {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim();
    const password = process.env.ADMIN_PASSWORD || 'fotografer123';
    const insertData = {
      username,
      password_hash: hashPassword(password),
      name: process.env.ADMIN_NAME || 'Fotografer Utama',
      whatsapp: process.env.ADMIN_WHATSAPP || null,
    };

    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .limit(1);

    if (fetchErr) {
      console.error('[auth] cek users gagal. Pastikan tabel "users" sudah dibuat via file migrations/multi_admin_setup.sql:', fetchErr.message);
      return;
    }

    if (existing && existing.length > 0) {
      // Akun admin harus SELALU bisa login pakai password dari .env,
      // meskipun username-nya sudah terlanjur dipakai akun baru.
      const { error: updErr } = await supabase
        .from('users')
        .update({
          password_hash: hashPassword(password),
          name: process.env.ADMIN_NAME || existing[0].username,
        })
        .eq('id', existing[0].id);
      if (updErr) {
        console.error('[auth] gagal reset password admin:', updErr.message);
        return;
      }
      console.log(`👤 Akun admin "${username}" dipastikan bisa login (password: ${password})`);
      return;
    }

    const { error: insErr } = await supabase.from('users').insert(insertData);
    if (insErr) {
      if (insErr.code === '23505') {
        console.log(`[auth] Username "${username}" sedang dipakai — coba lagi saat restart berikutnya.`);
      } else {
        console.error('[auth] gagal seed admin:', insErr.message);
      }
    } else {
      console.log(`👤 Akun admin default dibuat: ${username} (password: ${password})`);
    }
  } catch (err) {
    console.error('[auth] seed gagal:', err.message);
  }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, requireAuth, ensureDefaultAdmin };
