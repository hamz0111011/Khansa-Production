import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { showToast, confirmDelete } from '../lib/swal'
import logo from '../assets/Logo_khansa.png'
import './AdminDashboard.css'

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
function fmtDeadline(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  if (diff < 0) return <span className="ad-expired-text">Kedaluwarsa</span>
  const h = Math.floor(diff / 3600000)
  const day = Math.floor(h / 24)
  if (day > 0) return `${day} hari lagi`
  return `${h} jam lagi`
}

/* ── Status Badge ────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    selesai: { cls: 'badge-selesai', label: '✓ Selesai' },
    expired: { cls: 'badge-expired', label: '✕ Expired' },
    memilih: { cls: 'badge-memilih', label: '◎ Memilih' },
    menunggu: { cls: 'badge-menunggu', label: '○ Menunggu' },
  }
  const { cls, label } = map[status] || map.menunggu
  return <span className={`badge ${cls}`}>{label}</span>
}

/* ── New Session Form ────────────────────────────────────────── */
function SessionForm({ onCreated }) {
  const [form, setForm] = useState({
    clientName: '',
    driveLink: '',
    whatsapp: '',
    deadline: '',
  })
  const [loading, setLoading] = useState(false)
  const [waLink, setWaLink] = useState(null) // link WA setelah submit

  // Set deadline default: 3 hari dari sekarang
  useEffect(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    d.setHours(23, 59, 0, 0)
    setForm(p => ({ ...p, deadline: d.toISOString().slice(0, 16) }))
  }, [])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setWaLink(null)
    try {
      const { data } = await api.post('/sessions', form)

      // Buat pesan WA
      const sessionUrl = `${window.location.origin}/session/${data.id}`
      const deadlineStr = new Date(data.deadline).toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      const msg = encodeURIComponent(
        `Halo ${data.clientName}! 📸\n\n` +
        `Foto-foto Anda sudah siap untuk dipilih.\n\n` +
        `🔗 Link Galeri:\n${sessionUrl}\n\n` +
        `📋 Ketentuan:\n` +
        `• Batas waktu: *${deadlineStr}*\n\n` +
        `Klik link di atas untuk memilih foto kesayangan Anda. Hubungi kami jika ada pertanyaan. 🙏`
      )
      const waNumber = data.whatsapp
      const waUrl = `https://wa.me/${waNumber}?text=${msg}`
      setWaLink({ url: waUrl, session: data })

      // Reset form
      setForm(p => ({ ...p, clientName: '', driveLink: '', whatsapp: '' }))
      onCreated(data)
      showToast(`Sesi untuk ${data.clientName} berhasil dibuat!`, 'success')
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal membuat sesi', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="card ad-session-form-card">
        <div className="flex-between mb-16">
          <div>
            <h2 className="ad-form-title">Buat Sesi Baru</h2>
            <p className="text-sm text-dim ad-form-subtitle">Isi data klien lalu kirim link via WhatsApp</p>
          </div>
          <div className="ad-form-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid-2 ad-mb-16">
            <div className="form-group">
              <label className="form-label">Nama Klien *</label>
              <input
                className="form-input"
                placeholder="Contoh: Intan & Reza"
                value={form.clientName}
                onChange={e => set('clientName', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nomor WhatsApp *</label>
              <input
                className="form-input"
                placeholder="08xx / +62xx"
                value={form.whatsapp}
                onChange={e => set('whatsapp', e.target.value)}
                required
              />
              <span className="form-hint">Format: 0812xxxx atau +6281xxxx</span>
            </div>
          </div>

          <div className="form-group ad-mb-16">
            <label className="form-label">Link Google Drive *</label>
            <input
              className="form-input"
              placeholder="https://drive.google.com/drive/folders/..."
              value={form.driveLink}
              onChange={e => set('driveLink', e.target.value)}
              required
            />
            <span className="form-hint">Pastikan folder sudah diset "Anyone with the link" → Viewer</span>
          </div>

          <div className="form-group">
              <label className="form-label">Batas Waktu *</label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.deadline}
                onChange={e => set('deadline', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

          <button type="submit" className="btn btn-gold ad-submit-btn" disabled={loading}>
            {loading ? (
              <><div className="spinner spinner-sm" /> Membuat sesi…</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" />
                </svg>
                Buat Sesi & Kirim WhatsApp
              </>
            )}
          </button>
        </form>

        {/* WA Link Result */}
        {waLink && (
          <div className="ad-success-box">
            <div className="flex-between ad-mb-12">
              <span className="ad-success-title">
                ✓ Sesi berhasil dibuat!
              </span>
            </div>

            {/* Session link */}
            <div className="ad-mb-10">
              <span className="text-xs text-dim ad-link-label">Link Galeri Klien:</span>
              <div className="ad-link-display">
                {window.location.origin}/session/{waLink.session.id}
              </div>
            </div>

            <div className="ad-flex-gap-8">
              <a
                href={waLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-gold ad-wa-btn-flex"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                Kirim via WhatsApp
              </a>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/session/${waLink.session.id}`)
                  showToast('Link disalin!', 'success')
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Salin Link
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ── Sessions Table ──────────────────────────────────────────── */
function SessionsTable({ sessions, onDelete, onRefresh }) {
  const [deleting, setDeleting] = useState(null)
  const [expanded, setExpanded] = useState(null)

  async function handleDelete(id, name) {
    const ok = await confirmDelete(
      `Hapus sesi "${name}"?`,
      'Data pilihan klien akan ikut terhapus dan tidak bisa dikembalikan.'
    )
    if (!ok) return
    setDeleting(id)
    try {
      await api.delete(`/sessions/${id}`)
      onDelete(id)
      showToast('Sesi dihapus', 'info')
    } catch {
      showToast('Gagal menghapus sesi', 'error')
    } finally {
      setDeleting(null)
    }
  }

  function sendWA(session) {
    const sessionUrl = `${window.location.origin}/session/${session.id}`
    const deadlineStr = new Date(session.deadline).toLocaleString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
    const msg = encodeURIComponent(
      `Halo ${session.clientName}! 📸\n\n` +
      `Foto-foto Anda sudah siap untuk dipilih.\n\n` +
      `🔗 Link Galeri:\n${sessionUrl}\n\n` +
      `📋 Ketentuan:\n` +
      `• Batas waktu: *${deadlineStr}*\n\n` +
      `Klik link di atas untuk memilih foto. 🙏`
    )
    window.open(`https://wa.me/${session.whatsapp}?text=${msg}`, '_blank')
  }

  if (!sessions.length) {
    return (
      <div className="ad-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1"
          className="ad-mb-16">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
        <p className="ad-empty-text">Belum ada sesi yang dibuat</p>
        <p className="text-xs text-dim ad-mt-4">Buat sesi baru di form di atas</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Klien</th>
              <th>WhatsApp</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Pilihan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <Fragment key={s.id}>
                <tr className="ad-table-row-clickable"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <td>
                    <div className="ad-client-name">{s.clientName}</div>
                    <div className="text-xs text-dim">{fmtDate(s.createdAt)}</div>
                  </td>
                  <td>
                    <a href={`tel:+${s.whatsapp}`}
                      className="ad-wa-link"
                      onClick={e => e.stopPropagation()}>
                      +{s.whatsapp}
                    </a>
                  </td>
                  <td>
                    <div className="text-xs ad-text-color2">{fmtDate(s.deadline)}</div>
                    <div className="text-xs">{fmtDeadline(s.deadline)}</div>
                  </td>
                  <td><StatusBadge status={s.status} /></td>
                  <td>
                    <span style={{
                      fontWeight: 600,
                      color: 'var(--text)',
                    }}>
                      {s.selections?.length || 0}
                    </span>
                    <span className="text-dim"> foto</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="ad-table-actions">
                      {/* WA button */}
                      <button
                        className="btn-icon"
                        onClick={() => sendWA(s)}
                        title="Kirim ulang WhatsApp"
                        style={{ color: 'var(--green)' }}
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                        </svg>
                      </button>
                      {/* Copy link */}
                      <button
                        className="btn-icon"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/session/${s.id}`)
                          showToast('Link disalin!', 'success')
                        }}
                        title="Salin link klien"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      {/* Open session */}
                      <a
                        className="btn-icon ad-inline-flex-center"
                        href={`/session/${s.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Buka halaman klien"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                      {/* Delete */}
                      <button
                        className="btn-icon ad-delete-btn"
                        onClick={() => handleDelete(s.id, s.clientName)}
                        disabled={deleting === s.id}
                        title="Hapus sesi"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded row: photo selections */}
                {expanded === s.id && (
                  <tr key={`${s.id}-exp`}>
                    <td colSpan={6} className="ad-p-0">
                      <div className="ad-expanded-content">
                        <div className="flex-between mb-16">
                          <h3 className="ad-expanded-title">
                            Foto yang Dipilih oleh {s.clientName}
                          </h3>
                          {s.submitted && (
                            <span className="badge badge-selesai">✓ Sudah dikonfirmasi</span>
                          )}
                        </div>

                        {s.selections?.length ? (
                          <div className="ad-flex-col-gap-6">
                            {s.selections.map((sel, i) => (
                              <div key={i} className="ad-photo-item">
                                <span className="ad-photo-index">{i + 1}</span>
                                <div className="ad-flex-1">
                                  <div className="ad-photo-name">{sel.name || `Foto ${i + 1}`}</div>
                                  {sel.id && (
                                    <div className="text-xs text-dim ad-photo-id">
                                      ID: {sel.id}
                                    </div>
                                  )}
                                </div>
                                {sel.id && (
                                  <a
                                    href={`https://drive.google.com/file/d/${sel.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost btn-sm ad-no-decoration"
                                  >
                                    Buka Drive
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-dim text-sm">
                            {s.status === 'menunggu' ? 'Klien belum membuka galeri.' : 'Klien belum memilih foto.'}
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ── Stats Card ──────────────────────────────────────────────── */
function StatCard({ icon, label, value, color }) {
  return (
    <div className="card ad-stat-card">
      <div className="ad-stat-icon-wrap" style={{ background: `rgba(${color},0.12)` }}>
        <span className="ad-stat-icon">{icon}</span>
      </div>
      <div>
        <div className="ad-stat-value" style={{ color: `rgb(${color})` }}>{value}</div>
        <div className="text-xs text-dim ad-mt-3">{label}</div>
      </div>
    </div>
  )
}

/* ── Admin Dashboard Page ────────────────────────────────────── */
export default function AdminDashboard() {
  const nav = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('fg_user') || 'null')
    } catch { return null }
  }, [])

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get('/sessions')
      setSessions(data)
    } catch (err) {
      if (err.response?.status !== 401) showToast('Gagal memuat data sesi', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSessions()
    const interval = setInterval(fetchSessions, 30000) // auto refresh tiap 30 detik
    return () => clearInterval(interval)
  }, [fetchSessions])

  function logout() {
    localStorage.removeItem('fg_token')
    localStorage.removeItem('fg_user')
    nav('/login')
  }

  // Stats
  const total = sessions.length
  const selesai = sessions.filter(s => s.status === 'selesai').length
  const aktif = sessions.filter(s => s.status === 'memilih' || s.status === 'menunggu').length
  const expired = sessions.filter(s => s.status === 'expired').length

  return (
    <div className="page-wrap ad-page-wrap">

      {/* Header / Nav */}
      <header className="ad-header">
        <div className="admin-header-nav ad-header-inner">
          <div className="ad-header-brand">
            <img
              src={logo}
              alt="Khansa Project"
              className="admin-logo ad-logo"
            />
            <div>
              <div className="admin-header-title ad-header-title">
                {currentUser?.name || 'Khansa Project'}
              </div>
              <div className="text-xs text-dim">
                {currentUser?.username ? `@${currentUser.username}` : 'Dashboard'}
              </div>
            </div>
          </div>

          <div className="ad-header-actions">
            <button className="btn-icon" onClick={fetchSessions} title="Refresh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
            <button
              className="btn-icon ad-gold-icon"
              onClick={() => nav('/settings/password')}
              title="Ganti Password"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={logout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="admin-main ad-main">

        {/* Stats */}
        <div className="stats-grid">
          <StatCard icon="📋" label="Total Sesi" value={total} color="200,200,220" />
          <StatCard icon="✅" label="Selesai" value={selesai} color="74,222,128" />
          <StatCard icon="⏳" label="Aktif" value={aktif} color="96,165,250" />
          <StatCard icon="⚠️" label="Expired" value={expired} color="248,113,113" />
        </div>

        {/* Form */}
        <SessionForm onCreated={s => {
          setSessions(p => [{ ...s, status: 'menunggu' }, ...p])
        }} />

        {/* Table */}
        <div>
          <div className="flex-between mb-16">
            <h2 className="ad-list-title">
              Daftar Sesi
              {sessions.length > 0 && (
                <span className="ad-list-badge">
                  {sessions.length}
                </span>
              )}
            </h2>
            <button className="btn btn-ghost btn-sm" onClick={fetchSessions}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-center">
              <div className="spinner" />
              <span>Memuat data sesi…</span>
            </div>
          ) : (
            <SessionsTable
              sessions={sessions}
              onDelete={id => setSessions(p => p.filter(s => s.id !== id))}
              onRefresh={fetchSessions}
            />
          )}
        </div>
      </main>
    </div>
  )
}
