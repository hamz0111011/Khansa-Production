/* ═══════════════════════════════════════════════════════════════
   LIB/AUTH.JS — JWT + password hashing untuk Next.js API Routes
═══════════════════════════════════════════════════════════════ */

import crypto from 'crypto'
import supabase from './supabase.js'

const SCRYPT_KEYLEN = 64
const JWT_SECRET   = process.env.JWT_SECRET || 'khansa-multi-secret'
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000 // 30 hari

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const parts = (stored || '').split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hash] = parts
  const test = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'))
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(s, 'base64')
}

export function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body   = b64url(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_EXPIRY }))
  const sig    = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${header}.${body}.${sig}`
}

export function verifyToken(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
    const payload = JSON.parse(b64urlDecode(body).toString('utf8'))
    if (!payload.uid) return null
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch { return null }
}

/**
 * Helper untuk Next.js API Routes: baca token dari header Authorization
 * @param {Request} req - Next.js Request object
 * @returns {object|null} payload JWT atau null
 */
export function getAuthPayload(req) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  return verifyToken(token)
}

/**
 * Pastikan akun admin default ada. Dipanggil lazy saat login pertama kali.
 */
let adminEnsured = false
export async function ensureDefaultAdmin() {
  if (adminEnsured) return
  try {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim()
    const password = process.env.ADMIN_PASSWORD || 'fotografer123'
    const insertData = {
      username,
      password_hash: hashPassword(password),
      name: process.env.ADMIN_NAME || 'Fotografer Utama',
      whatsapp: process.env.ADMIN_WHATSAPP || null,
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('users')
      .select('id, username')
      .eq('username', username)
      .limit(1)

    if (fetchErr) {
      console.error('[auth] cek users gagal:', fetchErr.message)
      return
    }

    if (existing && existing.length > 0) {
      await supabase
        .from('users')
        .update({
          password_hash: hashPassword(password),
          name: process.env.ADMIN_NAME || existing[0].username,
        })
        .eq('id', existing[0].id)
      adminEnsured = true
      return
    }

    const { error: insErr } = await supabase.from('users').insert(insertData)
    if (!insErr) adminEnsured = true
  } catch (err) {
    console.error('[auth] seed gagal:', err.message)
  }
}
