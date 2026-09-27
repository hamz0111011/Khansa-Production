'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api'
import './Login.css'

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="login-input-icon-left">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="login-input-icon-left">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeBtn({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="login-input-icon-right" tabIndex={-1}>
      {show
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
    </button>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login') // 'login' | 'register'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regWa, setRegWa] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('fg_token')
    if (!token) return
    // Validate token with server before redirecting
    api.post('/auth/verify')
      .then(({ data }) => {
        if (data.valid) {
          router.replace('/dashboard')
        } else {
          // Token invalid, clear session
          sessionStorage.removeItem('fg_token')
          sessionStorage.removeItem('fg_user')
        }
      })
      .catch(() => {
        // Token invalid, clear session
        sessionStorage.removeItem('fg_token')
        sessionStorage.removeItem('fg_user')
      })
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { username, password })
      sessionStorage.setItem('fg_token', data.token)
      sessionStorage.setItem('fg_user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan, coba lagi')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/register', {
        username,
        password,
        name: regName || username,
        whatsapp: regWa || null,
      })
      setMode('login')
      setPassword('')
      setError('')
      setLoading(false)
      alert('Akun berhasil dibuat! Silakan login.')
      setMode('login')
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal membuat akun, coba lagi')
      setLoading(false)
    }
  }

  return (
    <div className="page-wrap login-page-wrap">
      {/* Background decoration */}
      <div className="login-bg-decoration" />

      <div className="login-content">
        {/* Back button */}
        <button
          onClick={() => router.push('/')}
          className="btn btn-ghost btn-sm login-back-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Kembali ke Beranda
        </button>

        {/* Logo / Brand */}
        <div className="login-header">
          <div className="login-logo-box">
            <Image src="/logo-khansa-6.png" alt="Khansa Project" width={80} height={80} className="login-logo-img" />
          </div>
          <h1 className="login-title">
            Khansa <span className="text-gold">Project</span>
          </h1>
          <p className="login-subtitle">
            Dashboard manajemen sesi foto klien
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="card-glass login-card">
          {/* Tabs */}
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab${mode === 'login' ? ' active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setPassword('') }}
            >
              Masuk
            </button>
            <button
              type="button"
              className={`login-tab${mode === 'register' ? ' active' : ''}`}
              onClick={() => { setMode('register'); setError('') }}
            >
              Daftar Akun
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="login-input-wrap">
                  <UserIcon />
                  <input
                    type="text"
                    className="form-input login-input-padded login-input-pl"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="login-input-wrap">
                  <LockIcon />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input login-input-padded login-input-pl"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <EyeBtn show={showPw} onToggle={() => setShowPw(v => !v)} />
                </div>
                {error && <span className="form-error">{error}</span>}
              </div>

              <button
                type="submit"
                className="btn btn-gold btn-full btn-lg"
                disabled={loading || !username || !password}
              >
                {loading ? (
                  <>
                    <div className="spinner-sm spinner" />
                    Memverifikasi…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    Masuk
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="login-form">
              <div className="form-group">
                <label className="form-label">Username *</label>
                <div className="login-input-wrap">
                  <UserIcon />
                  <input
                    type="text"
                    className="form-input login-input-padded login-input-pl"
                    placeholder="Min. 3 karakter, unik"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <div className="login-input-wrap">
                  <LockIcon />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input login-input-padded login-input-pl"
                    placeholder="Min. 6 karakter"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <EyeBtn show={showPw} onToggle={() => setShowPw(v => !v)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama (opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Khansa Project — Medan"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">No. WhatsApp (opsional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 6281xxxx"
                  value={regWa}
                  onChange={e => setRegWa(e.target.value)}
                />
              </div>

              {error && <span className="form-error">{error}</span>}

              <button
                type="submit"
                className="btn btn-gold btn-full btn-lg"
                disabled={loading || username.trim().length < 3 || password.length < 6}
              >
                {loading ? (
                  <>
                    <div className="spinner-sm spinner" />
                    Membuat akun…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="23" y1="11" x2="17" y2="11" />
                    </svg>
                    Daftar Akun
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="login-footer">
          © {new Date().getFullYear()} Khansa Project. All rights reserved.
        </p>
      </div>
    </div>
  )
}
