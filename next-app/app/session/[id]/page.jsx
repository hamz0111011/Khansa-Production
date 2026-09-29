'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { showToast, confirmSubmitPhotos } from '@/lib/swal'

function extractFolderId(link) {
  if (!link) return null
  // Trim whitespace yang mungkin ikut saat copy-paste
  const trimmed = link.trim()
  if (!trimmed) return null

  // 1) Format: /folders/FOLDER_ID (mencakup /drive/folders/, /drive/u/0/folders/, /drive/mobile/folders/, dll)
  const m1 = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]

  // 2) Format: ?id=FOLDER_ID atau &id=FOLDER_ID (mencakup /open?id=, /folderview?id=, dll)
  const m2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]

  // 3) Format: /file/d/FILE_ID (untuk single file link, bukan folder — tapi tetap coba extract)
  const m3 = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m3) return m3[1]

  // 4) Raw folder ID langsung (string alfanumerik 10+ karakter)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed

  return null
}
function thumbUrl(id, w = 400) { return `/api/drive/thumb/${id}?w=${w}` }
function bigUrl(id) { return `/api/drive/thumb/${id}?w=1600` }

function Countdown({ deadline }) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const calc = () => setLeft(Math.max(0, new Date(deadline) - new Date()))
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [deadline])

  if (left <= 0) return <div className="cg-deadline-warning">⚠️ Batas waktu sudah habis</div>

  const s = Math.floor(left / 1000)
  const days = Math.floor(s / 86400)
  const hrs = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const pad = n => String(n).padStart(2, '0')
  const urgent = left < 3600000

  return (
    <div className="countdown">
      {days > 0 && <><div className="cd-block"><div className="cd-num" style={urgent ? { color: 'var(--red)' } : {}}>{pad(days)}</div><div className="cd-label">Hari</div></div><div className="cd-sep">:</div></>}
      <div className="cd-block"><div className="cd-num" style={urgent ? { color: 'var(--red)' } : {}}>{pad(hrs)}</div><div className="cd-label">Jam</div></div>
      <div className="cd-sep">:</div>
      <div className="cd-block"><div className="cd-num" style={urgent ? { color: 'var(--red)' } : {}}>{pad(mins)}</div><div className="cd-label">Menit</div></div>
      <div className="cd-sep">:</div>
      <div className="cd-block"><div className="cd-num" style={urgent ? { color: 'var(--red)' } : {}}>{pad(secs)}</div><div className="cd-label">Detik</div></div>
    </div>
  )
}

function Lightbox({ photos, startIdx, selected, onToggle, onClose, onDownload, disabled }) {
  const [idx, setIdx] = useState(startIdx)
  const [imgKey, setImgKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [calm, setCalm] = useState(false)
  const [dlLoading, setDlLoading] = useState(false)
  const calmTimer = useRef()
  const touchStartX = useRef(0)

  const photo = photos[idx]
  const isSelected = selected.some(s => s.id === photo?.id)

  function resetCalm() {
    setCalm(false)
    clearTimeout(calmTimer.current)
    calmTimer.current = setTimeout(() => setCalm(true), 3000)
  }

  useEffect(() => { resetCalm(); return () => clearTimeout(calmTimer.current) }, [])
  useEffect(() => { setLoading(true); setScale(1); setImgKey(k => k + 1); resetCalm() }, [idx])
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'Escape') onClose()
      resetCalm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])

  function go(delta) { const next = idx + delta; if (next >= 0 && next < photos.length) setIdx(next) }
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    resetCalm()
  }

  async function handleDownload() {
    setDlLoading(true)
    await onDownload(photo)
    setDlLoading(false)
  }

  if (!photo) return null

  return (
    <div className="cg-lightbox-overlay" onMouseMove={resetCalm} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="cg-lightbox-topbar" style={{ opacity: calm ? 0 : 1 }}>
        <div className="cg-flex-center-gap-12">
          <span className="cg-lightbox-counter">{idx + 1} / {photos.length}</span>
          {photo.starred && <span className="cg-highlight-badge">✨ Sudah Diedit</span>}
        </div>
        <div className="cg-flex-gap-8">
          {/* Tombol minimize — kembali ke tampilan grid */}
          <button onClick={onClose} className="cg-lightbox-btn" title="Kembali ke galeri" style={{ marginRight: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button onClick={() => setScale(s => s === 1 ? 2 : 1)} className="cg-lightbox-btn" title={scale === 1 ? 'Zoom In' : 'Zoom Out'}>
            {scale === 1
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
            }
          </button>
          {/* Tombol download foto ini */}
          <button
            onClick={handleDownload}
            className="cg-lightbox-btn"
            title="Download foto ini"
            disabled={dlLoading}
            style={{ opacity: dlLoading ? 0.5 : 1 }}
          >
            {dlLoading
              ? <div className="spinner spinner-sm" style={{ width: 14, height: 14 }} />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            }
          </button>
          <button onClick={onClose} className="cg-lightbox-btn" title="Tutup">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>

      <div className="cg-lightbox-img-wrap" style={{ cursor: scale === 1 ? 'zoom-in' : 'zoom-out' }} onClick={() => setScale(s => s === 1 ? 2 : 1)}>
        {loading && <div className="cg-loader-overlay"><div className="spinner" /></div>}
        <img key={imgKey} src={bigUrl(photo.id)} alt={photo.name} onLoad={() => setLoading(false)} className="cg-lightbox-img" style={{ transform: `scale(${scale})`, opacity: loading ? 0 : 1 }} />

        {/* Overlay tombol pilih/batal — di dalam foto, bagian bawah */}
        {!disabled && (
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: 10,
              padding: '28px 16px 16px',
              zIndex: 5,
            }}
          >
            {isSelected ? (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(232,200,122,0.18)',
                  border: '1px solid rgba(232,200,122,0.5)',
                  borderRadius: 99, padding: '7px 18px',
                  color: 'var(--gold)', fontWeight: 600, fontSize: '0.875rem',
                  backdropFilter: 'blur(6px)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Terpilih
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onToggle(photo) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(248,113,113,0.18)',
                    border: '1px solid rgba(248,113,113,0.5)',
                    borderRadius: 99, padding: '7px 18px',
                    color: '#fca5a5', fontWeight: 600, fontSize: '0.875rem',
                    cursor: 'pointer', backdropFilter: 'blur(6px)',
                  }}
                  title="Batal pilih foto ini"
                >
                  <span style={{ fontSize: '0.9rem' }}>❌</span> Batal Pilih
                </button>
              </>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onToggle(photo) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(37,99,235,0.25)',
                  border: '1px solid rgba(96,165,250,0.6)',
                  borderRadius: 99, padding: '8px 28px',
                  color: '#93c5fd', fontWeight: 600, fontSize: '0.9rem',
                  cursor: 'pointer', backdropFilter: 'blur(6px)',
                }}
                title="Pilih foto ini"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                Pilih Foto
              </button>
            )}
          </div>
        )}
      </div>

      {idx > 0 && <button onClick={e => { e.stopPropagation(); go(-1) }} className="cg-nav-btn prev" style={{ opacity: calm ? 0 : 1 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>}
      {idx < photos.length - 1 && <button onClick={e => { e.stopPropagation(); go(1) }} className="cg-nav-btn next" style={{ opacity: calm ? 0 : 1 }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg></button>}

      <div className="cg-filmstrip-wrap" style={{ opacity: calm ? 0 : 1 }}>
        {photos.slice(Math.max(0, idx - 5), idx + 6).map((p, i) => {
          const realIdx = Math.max(0, idx - 5) + i
          const isSel = selected.some(s => s.id === p.id)
          return (
            <div key={p.id} onClick={e => { e.stopPropagation(); setIdx(realIdx) }} className="cg-filmstrip-item" style={{ outline: realIdx === idx ? '2px solid var(--gold)' : isSel ? '2px solid rgba(232,200,122,0.5)' : 'none', outlineOffset: realIdx === idx ? 2 : 0, opacity: realIdx === idx ? 1 : 0.55 }}>
              <img src={thumbUrl(p.id, 100)} alt="" className="cg-filmstrip-img" />
            </div>
          )
        })}
      </div>
      <div className="cg-swipe-hint" style={{ opacity: calm ? 0 : 1 }}>Geser kiri/kanan untuk pindah • Tap foto untuk zoom</div>
    </div>
  )
}

function PhotoCard({ photo, isSelected, selectionOrder, onToggle, onZoom, onDownload, disabled }) {
  const [status, setStatus] = useState('idle')
  const [dlLoading, setDlLoading] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const imgRef = useRef()

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && imgRef.current) {
        setStatus('loading')
        imgRef.current.src = thumbUrl(photo.id, 600)
        obs.disconnect()
      }
    }, { rootMargin: '300px' })
    if (imgRef.current) obs.observe(imgRef.current)
    return () => obs.disconnect()
  }, [photo.id, retryKey])

  async function handleDownload(e) {
    e.stopPropagation()
    setDlLoading(true)
    await onDownload(photo)
    setDlLoading(false)
  }

  function handleRetry(e) {
    e.stopPropagation()
    setStatus('idle')
    setRetryKey(k => k + 1)
  }

  return (
    <div className={`photo-card${isSelected ? ' selected' : ''} cg-pointer`} onClick={() => onZoom()}>
      {status !== 'loaded' && status !== 'error' && (
        <div className="cg-card-skeleton" style={{ animation: status === 'loading' ? 'pulse 1.5s ease infinite' : 'none' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
        </div>
      )}
      {status === 'error' && (
        <div className="cg-card-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.4)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="rgba(248,113,113,0.4)" /></svg>
          <span className="cg-error-text">Gagal dimuat</span>
          <button
            onClick={handleRetry}
            style={{
              marginTop: 6,
              fontSize: '0.68rem',
              padding: '3px 10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 99,
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}
          >
            ↺ Coba lagi
          </button>
        </div>
      )}
      <img key={retryKey} ref={imgRef} src={undefined} alt={photo.name} onLoad={() => setStatus('loaded')} onError={() => setStatus('error')} style={{ opacity: status === 'loaded' ? 1 : 0, transition: 'opacity 0.4s' }} />
      {photo.starred && <div className="cg-card-badge" style={{ background: 'rgba(52,211,153,0.9)', fontSize: '0.65rem', padding: '3px 7px', borderRadius: 99, color: '#fff', fontWeight: 700, letterSpacing: '0.03em' }}>✨ Diedit</div>}
      <div className="photo-overlay">
        <div className="cg-flex-gap-8">
          <button onClick={e => { e.stopPropagation(); onZoom() }} className="cg-overlay-btn" title="Zoom foto"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg></button>
          {/* Tombol download foto ini */}
          <button
            onClick={handleDownload}
            className="cg-overlay-btn"
            title="Download foto ini"
            disabled={dlLoading}
            style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(52,211,153,0.5)', color: '#6ee7b7' }}
          >
            {dlLoading
              ? <div className="spinner spinner-sm" style={{ width: 13, height: 13 }} />
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            }
          </button>
          {!disabled && isSelected && (
            <>
              <button onClick={e => { e.stopPropagation(); onZoom() }} className="cg-overlay-btn cg-overlay-selected" title="Foto sudah dipilih" style={{ pointerEvents: 'none' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></button>
              <button onClick={e => { e.stopPropagation(); onToggle(photo) }} className="cg-overlay-btn cg-overlay-deselect" title="Batal pilih foto ini"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </>
          )}
          {!disabled && !isSelected && (
            <button onClick={e => { e.stopPropagation(); onToggle(photo) }} className="cg-overlay-btn" style={{ background: 'rgba(37,99,235,0.25)', border: '1px solid rgba(96,165,250,0.6)', color: '#93c5fd' }} title="Pilih foto"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg></button>
          )}
        </div>
      </div>
      {isSelected && <div className="cg-sel-order">{selectionOrder}</div>}
    </div>
  )
}


function TabBar({ active, onChange, total, highlights, selected }) {
  const tabs = [
    { id: 'all', label: 'Semua', count: total },
    { id: 'highlight', label: '✨ Sudah Diedit', count: highlights },
    { id: 'selected', label: 'Terpilih', count: selected },
  ]
  return (
    <div className="cg-tab-bar">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} className="cg-tab" style={{ background: active === t.id ? (t.id === 'highlight' ? 'linear-gradient(135deg, #665032ff, #2b241dff)' : 'var(--surface2)') : 'transparent', color: active === t.id ? (t.id === 'highlight' ? '#fff' : 'var(--text)') : 'var(--text3)', borderBottom: active === t.id ? `2px solid ${t.id === 'highlight' ? 'rgba(255, 255, 255, 1)' : 'var(--text2)'}` : '2px solid transparent' }}>
          {t.label}
          <span className="cg-tab-count" style={{ color: active === t.id ? 'inherit' : 'var(--text3)' }}>{t.count}</span>
        </button>
      ))}
    </div>
  )
}

async function fetchDrivePhotos(folderId, apiKey, pageToken) {
  const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`)
  const fields = encodeURIComponent('nextPageToken,files(id,name,mimeType,imageMediaMetadata)')
  let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200&orderBy=name&key=${apiKey}`
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  return res.json()
}

// Foto dianggap "Sudah Diedit" jika namanya diawali dengan "EDIT_", "edit_", atau "ED_"
function isEdited(name = '') {
  const lower = name.toLowerCase()
  return lower.startsWith('edit_') || lower.startsWith('ed_')
}

async function loadAllDrivePhotos(folderId, apiKey) {
  let all = [], token = null
  do {
    const data = await fetchDrivePhotos(folderId, apiKey, token)
    if (data.files) all = all.concat(data.files)
    token = data.nextPageToken || null
  } while (token)
  // Tandai setiap foto apakah sudah diedit berdasarkan nama file
  return all.map(f => ({ ...f, starred: isEdited(f.name) }))
}


export default function ClientGalleryPage() {
  const { id } = useParams()
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [photos, setPhotos] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [photosLoading, setPhotosLoading] = useState(false)
  const [error, setError] = useState(null)
  const [driveError, setDriveError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [waUrl, setWaUrl] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [lbIdx, setLbIdx] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const LS_KEY = `fg_sel_${id}`

  const loadPhotos = useCallback(async (driveLink) => {
    setPhotosLoading(true)
    setDriveError(null)
    try {
      const folderId = extractFolderId(driveLink)
      if (!folderId) throw new Error('Format link Google Drive tidak dikenali. Pastikan link berformat: https://drive.google.com/drive/folders/...')
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY
      if (!apiKey) throw new Error('API Key belum dikonfigurasi. Hubungi fotografer.')
      const files = await loadAllDrivePhotos(folderId, apiKey)
      if (!files.length) setDriveError('Tidak ada foto dalam folder ini. Pastikan folder Drive berisi foto dan diset publik.')
      else setPhotos(files)
    } catch (err) {
      const msg = err.message.includes('403')
        ? 'Akses ditolak. Pastikan folder Google Drive diset "Anyone with the link" → Viewer.'
        : err.message.includes('400')
          ? 'API Key tidak valid. Periksa konfigurasi fotografer.'
          : 'Gagal memuat foto: ' + err.message
      setDriveError(msg)
    } finally {
      setPhotosLoading(false)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/sessions/${id}`)
        setSession(data)
        setSubmitted(data.submitted)
        if (data.submitted) {
          if (data.selections?.length) setSelected(data.selections)
        } else {
          const lsSaved = localStorage.getItem(`fg_sel_${id}`)
          if (lsSaved) { try { setSelected(JSON.parse(lsSaved)) } catch { } }
          else if (data.selections?.length) setSelected(data.selections)
        }
        if (data.driveLink) loadPhotos(data.driveLink)
      } catch (err) {
        setError(err.response?.status === 404 ? 'Sesi tidak ditemukan. Link mungkin sudah tidak valid.' : 'Gagal memuat data. Periksa koneksi internet Anda.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, loadPhotos])

  useEffect(() => {
    if (submitted) return
    if (selected.length > 0) localStorage.setItem(LS_KEY, JSON.stringify(selected))
    else localStorage.removeItem(LS_KEY)
  }, [selected, submitted, LS_KEY])

  function togglePhoto(photo) {
    const isExpired = session && new Date() > new Date(session.deadline)
    if (submitted || isExpired) return
    const idx = selected.findIndex(s => s.id === photo.id)
    if (idx >= 0) {
      setSelected(p => p.filter(s => s.id !== photo.id))
    } else {
      const maxPhotos = session?.maxPhotos
      if (maxPhotos && maxPhotos < 99999 && selected.length >= maxPhotos) {
        showToast(`Batas pilih foto sudah tercapai (${maxPhotos} foto)`, 'error')
        return
      }
      setSelected(p => [...p, { id: photo.id, name: photo.name }])
    }
  }

  function clearAll() { if (!selected.length) return; setSelected([]); showToast('Semua pilihan dibatalkan', 'info') }

  function selectAll() {
    const isExpired = session && new Date() > new Date(session.deadline)
    if (submitted || isExpired) return
    if (!photos.length) { showToast('Belum ada foto untuk dipilih', 'error'); return }
    const pool = activeTab === 'highlight' ? highlightPhotos : photos
    const alreadyIds = new Set(selected.map(s => s.id))
    const toAdd = pool.filter(p => !alreadyIds.has(p.id))
    if (!toAdd.length) { showToast('Semua foto sudah dipilih', 'info'); return }
    const maxPhotos = session?.maxPhotos
    let newSelected
    if (maxPhotos && maxPhotos < 99999) {
      const remaining = maxPhotos - selected.length
      if (remaining <= 0) { showToast(`Batas pilih foto sudah tercapai (${maxPhotos} foto)`, 'error'); return }
      newSelected = [...selected, ...toAdd.slice(0, remaining).map(p => ({ id: p.id, name: p.name }))]
      if (toAdd.length > remaining) showToast(`Hanya ${remaining} foto ditambahkan (batas ${maxPhotos} foto)`, 'info')
      else showToast(`${newSelected.length} foto dipilih`, 'success')
    } else {
      newSelected = [...selected, ...toAdd.map(p => ({ id: p.id, name: p.name }))]
      showToast(`${newSelected.length} foto dipilih`, 'success')
    }
    setSelected(newSelected)
  }

  async function downloadAll() {
    // Download SEMUA foto dari folder Drive (tidak dibatasi oleh batas pilih)
    const downloadList = photos.length > 0 ? photos : selected
    if (!downloadList.length) { showToast('Belum ada foto untuk diunduh', 'error'); return }
    setDownloading(true)
    showToast(`Menyiapkan download ${downloadList.length} foto…`, 'info')
    try {
      for (let i = 0; i < downloadList.length; i++) {
        const photo = downloadList[i]
        const url = `/api/drive/thumb/${photo.id}?w=1600&dl=1`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Gagal unduh foto ${i + 1}`)
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = photo.name || `foto-${i + 1}.jpg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 300))
      }
      showToast('Semua foto berhasil diunduh! 🎉', 'success')
    } catch (err) {
      showToast('Gagal mengunduh: ' + err.message, 'error')
    } finally {
      setDownloading(false)
    }
  }

  async function downloadSingle(photo) {
    try {
      const url = `/api/drive/thumb/${photo.id}?w=1600&dl=1`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Gagal mengunduh foto')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = photo.name || `foto.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      showToast(`↓ ${photo.name || 'Foto'} berhasil diunduh`, 'success')
    } catch (err) {
      showToast('Gagal mengunduh: ' + err.message, 'error')
    }
  }

  async function handleSubmit() {
    if (!selected.length) { showToast('Pilih minimal 1 foto dulu', 'error'); return }
    const ok = await confirmSubmitPhotos(selected.length)
    if (!ok) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/sessions/${id}/submit`, { selections: selected })
      setSubmitted(true)
      localStorage.removeItem(LS_KEY)
      if (data.waUrl) { setWaUrl(data.waUrl); window.open(data.waUrl, '_blank') }
      showToast('Pilihan berhasil dikonfirmasi! Terima kasih 🎉', 'success')
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal menyimpan', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const highlightPhotos = photos.filter(p => p.starred)
  const displayPhotos = activeTab === 'all' ? photos : activeTab === 'highlight' ? highlightPhotos : photos.filter(p => selected.some(s => s.id === p.id))

  function openLightbox(photo) {
    const idx = displayPhotos.findIndex(p => p.id === photo.id)
    setLbIdx(idx >= 0 ? idx : 0)
  }

  const isDeadlinePassed = session && new Date() > new Date(session.deadline)
  const disabled = submitted || isDeadlinePassed

  if (loading) return <div className="loading-center cg-min-h-screen"><div className="spinner" /><span>Memuat galeri…</span></div>
  if (error) return (
    <div className="cg-centered-page">
      <div className="card cg-error-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" className="cg-mb-16"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="var(--red)" /></svg>
        <h2 className="cg-mb-8">Oops!</h2><p className="cg-text-color2">{error}</p>
      </div>
    </div>
  )
  if (isDeadlinePassed && !submitted) return (
    <div className="cg-centered-page cg-timeout-page">
      <div className="card cg-error-card">
        <div className="cg-timeout-icon-box"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
        <h2 className="cg-mb-8">Waktu Habis</h2>
        <p className="cg-text-color2">Batas waktu pemilihan foto sudah berakhir. Hubungi fotografer.</p>
      </div>
    </div>
  )

  return (
    <div className="page-wrap cg-page-wrap cg-pb-100">
      {lbIdx !== null && displayPhotos.length > 0 && (
        <Lightbox photos={displayPhotos} startIdx={lbIdx} selected={selected} onToggle={togglePhoto} onClose={() => setLbIdx(null)} onDownload={downloadSingle} disabled={disabled} />
      )}

      {/* Banner sukses setelah submit */}
      {submitted && (
        <div style={{
          background: 'linear-gradient(135deg, #201b14ff, #2b241dff)',
          borderBottom: '1px solid #3e362d',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>Pilihan foto sudah dikonfirmasi — {selected.length} foto</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: 2 }}>Pantau tab <strong style={{ color: '#fff' }}>✨ Sudah Diedit</strong> untuk melihat foto yang sudah selesai diedit fotografer</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                Kirim Ulang WA
              </a>
            )}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => setActiveTab('highlight')}>
              ✨ Lihat Foto Diedit
            </button>
            <button
              className="btn btn-gold btn-sm"
              style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => router.push(`/session/${id}/album`)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              Lihat Album
            </button>
          </div>
        </div>
      )}

      <header className="cg-page-header">
        <div className="cg-header-inner">
          <div className="cg-header-title-box">
            <div className="cg-eyebrow">{submitted ? 'Memantau Hasil Edit' : 'Album Foto'}</div>
            <h1 className="cg-client-name">{session?.clientName}</h1>
          </div>
          {!submitted && (
            <div className="cg-timer-box">
              <div className="text-xs text-dim cg-timer-label">⏳ Batas waktu memilih</div>
              <Countdown deadline={session?.deadline} />
            </div>
          )}
          <TabBar active={activeTab} onChange={setActiveTab} total={photos.length} highlights={highlightPhotos.length} selected={selected.length} />
        </div>
      </header>

      {photosLoading ? (
        <div className="loading-center cg-min-h-60"><div className="spinner" /><span>Memuat foto dari Google Drive…</span></div>
      ) : driveError ? (
        <div className="loading-center cg-error-state">
          <div className="cg-error-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><circle cx="12" cy="16" r="0.5" fill="var(--red)" /></svg></div>
          <div><p className="cg-error-title">Gagal Memuat Foto</p><p className="cg-error-desc">{driveError}</p></div>
          <button className="btn btn-ghost btn-sm" onClick={() => session?.driveLink && loadPhotos(session.driveLink)}>Coba Lagi</button>
        </div>
      ) : displayPhotos.length === 0 ? (
        <div className="loading-center cg-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          <p className="cg-text-color3">{activeTab === 'highlight' ? 'Belum ada foto yang sudah diedit. Fotografer akan menandai foto yang sudah diedit.' : activeTab === 'selected' ? 'Belum ada foto yang dipilih.' : 'Tidak ada foto.'}</p>
          {activeTab !== 'all' && <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('all')}>Lihat Semua Foto</button>}
        </div>
      ) : (
        <div className="masonry cg-masonry-pad">
          {displayPhotos.map(photo => {
            const isSel = selected.some(s => s.id === photo.id)
            const order = selected.findIndex(s => s.id === photo.id) + 1
            return <PhotoCard key={photo.id} photo={photo} isSelected={isSel} selectionOrder={order > 0 ? order : ''} onToggle={togglePhoto} onZoom={() => openLightbox(photo)} onDownload={downloadSingle} disabled={disabled} />
          })}
        </div>
      )}

      <div className="selection-bar">
        {submitted ? (
          /* Mode pantau: tampilkan info status, bukan tombol pilih */
          <>
            <div className="sel-count">
              <div className="sel-count-num">{selected.length}</div>
              <div className="sel-count-label">foto dikonfirmasi</div>
            </div>
            <div className="cg-selbar-actions">
              <span style={{ fontSize: '0.8rem', color: 'var(--text3)' }}>Mode pantau — pilihan sudah dikunci</span>
              <button
                className="btn cg-selbar-btn cg-btn-download"
                onClick={downloadAll}
                disabled={downloading || photos.length === 0}
                title="Download semua foto"
              >
                {downloading
                  ? <><div className="spinner spinner-sm" /> Mengunduh…</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download Semua ({photos.length})</>
                }
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('highlight')}>
                ✨ {highlightPhotos.length} Sudah Diedit
              </button>
              <button
                className="btn btn-gold btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => router.push(`/session/${id}/album`)}
                title="Lihat album foto pilihan Anda"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                Lihat Album
              </button>
            </div>
          </>
        ) : (
          /* Mode pilih normal */
          <>
            <div className="sel-count">
              <div className="sel-count-num">{selected.length}</div>
              <div className="sel-count-label">
                foto dipilih
                {session?.maxPhotos && session.maxPhotos < 99999 && (
                  <span style={{
                    fontSize: '0.7rem',
                    color: selected.length >= session.maxPhotos ? 'var(--red)' : 'var(--text3)',
                    display: 'block',
                    lineHeight: 1.2,
                    marginTop: 2,
                  }}>
                    maks {session.maxPhotos} foto
                  </span>
                )}
              </div>
            </div>
            <div className="cg-selbar-actions">
              {!disabled && <button className="btn btn-ghost cg-selbar-btn" onClick={clearAll} disabled={!selected.length} title="Batal semua pilihan"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>Batal Pilih</button>}
              {!disabled && <button className="btn btn-ghost cg-selbar-btn" onClick={selectAll} title="Pilih semua foto"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="3" /><polyline points="9 12 11 14 15 10" /></svg>Pilih Semua</button>}
              <button
                className="btn cg-selbar-btn cg-btn-download"
                onClick={downloadAll}
                disabled={downloading || photos.length === 0}
                title="Download semua foto"
              >
                {downloading
                  ? <><div className="spinner spinner-sm" /> Mengunduh…</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Download Semua ({photos.length})</>
                }
              </button>
              <button className="btn btn-gold cg-flex-shrink-0" onClick={handleSubmit} disabled={disabled || !selected.length || submitting}>
                {submitting ? <><div className="spinner spinner-sm" /> Menyimpan…</> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>Selesai Memilih</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
