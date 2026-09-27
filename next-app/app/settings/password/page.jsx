'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import api from '@/lib/api'
import { showToast } from '@/lib/swal'

export default function ChangePasswordPage() {
  const router = useRouter()
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.newPassword !== form.confirmPassword) { showToast('Password baru dan konfirmasi tidak cocok', 'error'); return }
    if (form.newPassword.length < 6) { showToast('Password baru minimal 6 karakter', 'error'); return }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword })
      showToast('Password berhasil diubah! Silakan login ulang.', 'success')
      setTimeout(() => {
        sessionStorage.removeItem('fg_token')
        sessionStorage.removeItem('fg_user')
        router.push('/login')
      }, 2000)
    } catch (err) {
      showToast(err.response?.data?.message || 'Gagal mengubah password', 'error')
    } finally {
      setLoading(false)
    }
  }

  function strength(pw) {
    if (!pw) return { level: 0, label: '', color: 'transparent' }
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    const map = [
      { level: 1, label: 'Lemah', color: 'var(--red)' },
      { level: 2, label: 'Cukup', color: 'var(--amber)' },
      { level: 3, label: 'Baik', color: 'var(--blue)' },
      { level: 4, label: 'Kuat', color: 'var(--green)' },
    ]
    return map[score - 1] || map[0]
  }

  const str = strength(form.newPassword)

  function EyeBtn({ show, onToggle }) {
    return (
      <button type="button" onClick={onToggle} className="cp-input-icon-right" tabIndex={-1}>
        {show
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        }
      </button>
    )
  }

  return (
    <div className="page-wrap cp-page-wrap">
      <div className="cp-bg-decoration" />

      <div className="cp-content">
        <button onClick={() => router.push('/dashboard')} className="btn btn-ghost btn-sm cp-back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Kembali ke Dashboard
        </button>

        <div className="cp-header">
          <div className="cp-logo-box">
            <Image src="/logo-khansa-6.png" alt="Khansa Project" width={60} height={60} className="cp-logo-img" />
          </div>
          <h1 className="cp-title">Ganti <span className="text-gold">Password</span></h1>
          <p className="cp-subtitle">Perbarui password akun admin Anda</p>
        </div>

        <div className="card-glass cp-card">
          <form onSubmit={handleSubmit} className="cp-form">
            <div className="form-group">
              <label className="form-label">Password Saat Ini</label>
              <div className="cp-input-wrap">
                <input type={showCurrent ? 'text' : 'password'} className="form-input cp-input-padded" placeholder="Masukkan password saat ini" value={form.currentPassword} onChange={e => set('currentPassword', e.target.value)} required autoFocus />
                <EyeBtn show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
              </div>
            </div>

            <div className="divider cp-divider" />

            <div className="form-group">
              <label className="form-label">Password Baru</label>
              <div className="cp-input-wrap">
                <input type={showNew ? 'text' : 'password'} className="form-input cp-input-padded" placeholder="Masukkan password baru" value={form.newPassword} onChange={e => set('newPassword', e.target.value)} required />
                <EyeBtn show={showNew} onToggle={() => setShowNew(v => !v)} />
              </div>
              {form.newPassword && (
                <div className="cp-strength-container">
                  <div className="cp-strength-bar-bg">
                    <div className="cp-strength-bar-fill" style={{ width: `${(str.level / 4) * 100}%`, background: str.color }} />
                  </div>
                  <span className="cp-strength-label" style={{ color: str.color }}>Kekuatan: {str.label}</span>
                </div>
              )}
              <span className="form-hint" style={{ marginTop: form.newPassword ? 0 : undefined }}>
                Minimal 6 karakter. Gunakan kombinasi huruf, angka, dan simbol untuk password yang kuat.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Konfirmasi Password Baru</label>
              <div className="cp-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input cp-input-padded"
                  placeholder="Ulangi password baru"
                  value={form.confirmPassword}
                  onChange={e => set('confirmPassword', e.target.value)}
                  required
                  style={{ borderColor: form.confirmPassword ? (form.confirmPassword === form.newPassword ? 'var(--green)' : 'var(--red)') : undefined }}
                />
                <EyeBtn show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
              </div>
              {form.confirmPassword && form.confirmPassword !== form.newPassword && (
                <span className="form-error">Password tidak cocok</span>
              )}
            </div>

            <button type="submit" className="btn btn-gold btn-full btn-lg cp-submit-btn" disabled={loading || !form.currentPassword || !form.newPassword || form.newPassword !== form.confirmPassword}>
              {loading ? <><div className="spinner-sm spinner" /> Menyimpan…</> : <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                Simpan Password Baru
              </>}
            </button>
          </form>
        </div>

        <div className="cp-warning-box">
          ⚠️ Setelah password berhasil diubah, Anda akan otomatis keluar dan diminta login ulang.
        </div>
      </div>
    </div>
  )
}
