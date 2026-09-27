import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { showToast, confirmSubmitPhotos } from '../lib/swal'
import './ClientGallery.css'

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function extractFolderId(link) {
  if (!link) return null
  const m1 = link.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (m1) return m1[1]
  const m2 = link.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return m2[1]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(link)) return link
  return null
}
// Pakai proxy Express agar tidak ada CORS/redirect issue
function thumbUrl(id, w = 400) { return `/api/drive/thumb/${id}?w=${w}` }
function bigUrl(id)             { return `/api/drive/thumb/${id}?w=1600` }

/* ══════════════════════════════════════════════════════════════
   COUNTDOWN
══════════════════════════════════════════════════════════════ */
function Countdown({ deadline }) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    const calc = () => setLeft(Math.max(0, new Date(deadline) - new Date()))
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [deadline])

  if (left <= 0) return (
    <div className="cg-deadline-warning">
      ⚠️ Batas waktu sudah habis
    </div>
  )

  const s    = Math.floor(left / 1000)
  const days = Math.floor(s / 86400)
  const hrs  = Math.floor((s % 86400) / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60
  const pad  = n => String(n).padStart(2, '0')
  const urgent = left < 3600000

  return (
    <div className="countdown">
      {days > 0 && <><div className="cd-block"><div className="cd-num" style={urgent?{color:'var(--red)'}:{}}>{pad(days)}</div><div className="cd-label">Hari</div></div><div className="cd-sep">:</div></>}
      <div className="cd-block"><div className="cd-num" style={urgent?{color:'var(--red)'}:{}}>{pad(hrs)}</div><div className="cd-label">Jam</div></div>
      <div className="cd-sep">:</div>
      <div className="cd-block"><div className="cd-num" style={urgent?{color:'var(--red)'}:{}}>{pad(mins)}</div><div className="cd-label">Menit</div></div>
      <div className="cd-sep">:</div>
      <div className="cd-block"><div className="cd-num" style={urgent?{color:'var(--red)'}:{}}>{pad(secs)}</div><div className="cd-label">Detik</div></div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   LIGHTBOX (ZOOM FULLSCREEN)
══════════════════════════════════════════════════════════════ */
function Lightbox({ photos, startIdx, selected, onToggle, onClose, disabled }) {
  const [idx,     setIdx]     = useState(startIdx)
  const [imgKey,  setImgKey]  = useState(0)
  const [loading, setLoading] = useState(true)
  const [scale,   setScale]   = useState(1)
  const [calm,    setCalm]    = useState(false)
  const calmTimer = useRef()
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const photo = photos[idx]
  const isSelected = selected.some(s => s.id === photo?.id)

  function resetCalm() {
    setCalm(false)
    clearTimeout(calmTimer.current)
    calmTimer.current = setTimeout(() => setCalm(true), 3000)
  }

  useEffect(() => { resetCalm(); return () => clearTimeout(calmTimer.current) }, [])

  useEffect(() => {
    setLoading(true)
    setScale(1)
    setImgKey(k => k + 1)
    resetCalm()
  }, [idx])

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft')  go(-1)
      if (e.key === 'Escape')     onClose()
      resetCalm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function go(delta) {
    const next = idx + delta
    if (next >= 0 && next < photos.length) setIdx(next)
  }

  // Touch swipe
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    if (dy > 80) onClose()
    resetCalm()
  }

  if (!photo) return null

  return (
    <div
      className="cg-lightbox-overlay"
      onMouseMove={resetCalm}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="cg-lightbox-topbar" style={{ opacity: calm ? 0 : 1 }}>
        <div className="cg-flex-center-gap-12">
          <span className="cg-lightbox-counter">
            {idx + 1} / {photos.length}
          </span>
          {photo.starred && (
            <span className="cg-highlight-badge">⭐ Highlight</span>
          )}
        </div>
        <div className="cg-flex-gap-8">
          {/* Zoom toggle */}
          <button
            onClick={() => setScale(s => s === 1 ? 2 : 1)}
            className="cg-lightbox-btn"
            title={scale === 1 ? 'Zoom In' : 'Zoom Out'}
          >
            {scale === 1
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            }
          </button>
          {/* Select toggle */}
          {!disabled && (
            <button
              onClick={() => onToggle(photo)}
              className="cg-lightbox-btn-base cg-select-btn"
              style={{
                background: isSelected ? 'rgba(232,200,122,0.2)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`,
                color: isSelected ? 'var(--gold)' : 'white',
              }}
            >
              {isSelected
                ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Terpilih</>
                : <>+ Pilih Foto</>
              }
            </button>
          )}
          {/* Close */}
          <button
            onClick={onClose}
            className="cg-lightbox-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="cg-lightbox-img-wrap"
        style={{ cursor: scale === 1 ? 'zoom-in' : 'zoom-out' }}
        onClick={() => setScale(s => s === 1 ? 2 : 1)}
      >
        {loading && (
          <div className="cg-loader-overlay">
            <div className="spinner" />
          </div>
        )}
        <img
          key={imgKey}
          src={bigUrl(photo.id)}
          alt={photo.name}
          onLoad={() => setLoading(false)}
          className="cg-lightbox-img"
          style={{
            transform: `scale(${scale})`,
            opacity: loading ? 0 : 1,
          }}
        />
        {/* Selected badge */}
        {isSelected && (
          <div className="cg-selected-badge">✓ Dipilih</div>
        )}
      </div>

      {/* Prev / Next */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); go(-1) }}
          className="cg-nav-btn prev"
          style={{ opacity: calm ? 0 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      {idx < photos.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); go(1) }}
          className="cg-nav-btn next"
          style={{ opacity: calm ? 0 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      )}

      {/* Bottom filmstrip */}
      <div className="cg-filmstrip-wrap" style={{ opacity: calm ? 0 : 1 }}>
        {photos.slice(Math.max(0, idx - 5), idx + 6).map((p, i) => {
          const realIdx = Math.max(0, idx - 5) + i
          const isSel   = selected.some(s => s.id === p.id)
          return (
            <div
              key={p.id}
              onClick={e => { e.stopPropagation(); setIdx(realIdx) }}
              className="cg-filmstrip-item"
              style={{
                outline: realIdx === idx ? '2px solid var(--gold)' : isSel ? '2px solid rgba(232,200,122,0.5)' : 'none',
                outlineOffset: realIdx === idx ? 2 : 0,
                opacity: realIdx === idx ? 1 : 0.55,
              }}
            >
              <img
                src={thumbUrl(p.id, 100)}
                alt=""
                className="cg-filmstrip-img"
              />
            </div>
          )
        })}
      </div>

      {/* Swipe hint */}
      <div className="cg-swipe-hint" style={{ opacity: calm ? 0 : 1 }}>
        Geser kiri/kanan untuk pindah • Tap foto untuk zoom
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   PHOTO CARD
══════════════════════════════════════════════════════════════ */
function PhotoCard({ photo, isSelected, selectionOrder, onToggle, onZoom, disabled }) {
  const [status, setStatus] = useState('idle')
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
  }, [photo.id])

  return (
    <div
      className={`photo-card${isSelected ? ' selected' : ''} cg-pointer`}
      onClick={() => onZoom()}
    >
      {/* Skeleton */}
      {status !== 'loaded' && status !== 'error' && (
        <div 
          className="cg-card-skeleton"
          style={{ animation: status === 'loading' ? 'pulse 1.5s ease infinite' : 'none' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="cg-card-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(248,113,113,0.4)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            <circle cx="12" cy="16" r="0.5" fill="rgba(248,113,113,0.4)"/>
          </svg>
          <span className="cg-error-text">Gagal dimuat</span>
        </div>
      )}

      <img
        ref={imgRef}
        alt={photo.name}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{ opacity: status === 'loaded' ? 1 : 0, transition: 'opacity 0.4s' }}
      />

      {/* Highlight badge */}
      {photo.starred && (
        <div className="cg-card-badge">⭐</div>
      )}

      {/* Hover overlay: zoom + select */}
      <div className="photo-overlay" style={{ opacity: undefined }}>
        <div className="cg-flex-gap-8">
          {/* Zoom */}
          <button
            onClick={e => { e.stopPropagation(); onZoom() }}
            className="cg-overlay-btn"
            title="Lihat besar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>

          {!disabled && isSelected && (
            <>
              {/* Terpilih (sudah dipilih — visual indicator) */}
              <button
                onClick={e => { e.stopPropagation(); onZoom() }}
                className="cg-overlay-btn cg-overlay-selected"
                title="Foto sudah dipilih"
                style={{ pointerEvents: 'none' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              {/* Batal Pilih (X merah) */}
              <button
                onClick={e => { e.stopPropagation(); onToggle(photo) }}
                className="cg-overlay-btn cg-overlay-deselect"
                title="Batal pilih foto ini"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </>
          )}

          {!disabled && !isSelected && (
            /* Pilih foto */
            <button
              onClick={e => { e.stopPropagation(); onToggle(photo) }}
              className="cg-overlay-btn"
              style={{
                background: 'rgba(37,99,235,0.25)',
                border: '1px solid rgba(96,165,250,0.6)',
                color: '#93c5fd',
              }}
              title="Pilih foto"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Selection number badge */}
      {isSelected && (
        <div className="cg-sel-order">
          {selectionOrder}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   TAB BAR
══════════════════════════════════════════════════════════════ */
function TabBar({ active, onChange, total, highlights, selected }) {
  const tabs = [
    { id: 'all',       label: 'Semua',     count: total },
    { id: 'highlight', label: '⭐ Highlight', count: highlights },
    { id: 'selected',  label: 'Terpilih',  count: selected },
  ]
  return (
    <div className="cg-tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="cg-tab"
          style={{
            background: active === t.id
              ? t.id === 'highlight' ? 'linear-gradient(135deg,rgba(232,200,122,0.2),rgba(232,200,122,0.1))'
                : 'var(--surface2)'
              : 'transparent',
            color: active === t.id
              ? t.id === 'highlight' ? 'var(--gold)' : 'var(--text)'
              : 'var(--text3)',
            borderBottom: active === t.id
              ? `2px solid ${t.id === 'highlight' ? 'var(--gold)' : 'var(--text2)'}` : '2px solid transparent',
          }}
        >
          {t.label}
          <span 
            className="cg-tab-count"
            style={{ color: active === t.id ? 'inherit' : 'var(--text3)' }}
          >
            {t.count}
          </span>
        </button>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   FETCH GOOGLE DRIVE
══════════════════════════════════════════════════════════════ */
async function fetchDrivePhotos(folderId, apiKey, pageToken) {
  // Sertakan field 'starred' untuk fitur Highlight
  const q      = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`)
  const fields = encodeURIComponent('nextPageToken,files(id,name,mimeType,starred,imageMediaMetadata)')
  let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=200&orderBy=name&key=${apiKey}`
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  return res.json()
}

async function loadAllDrivePhotos(folderId, apiKey) {
  let all = [], token = null
  do {
    const data = await fetchDrivePhotos(folderId, apiKey, token)
    if (data.files) all = all.concat(data.files)
    token = data.nextPageToken || null
  } while (token)
  return all
}

/* ══════════════════════════════════════════════════════════════
   CLIENT GALLERY PAGE
══════════════════════════════════════════════════════════════ */
export default function ClientGallery() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [session,      setSession]      = useState(null)
  const [photos,       setPhotos]       = useState([])
  const [selected,     setSelected]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [photosLoading, setPhotosLoading] = useState(false)
  const [error,        setError]        = useState(null)
  const [driveError,   setDriveError]   = useState(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [waUrl,        setWaUrl]        = useState(null)  // WhatsApp URL setelah submit
  const [activeTab,    setActiveTab]    = useState('all')
  const [lbIdx,        setLbIdx]        = useState(null) // null = closed

  // ── localStorage key untuk backup pilihan foto
  const LS_KEY = `fg_sel_${id}`

  // ── Load photos dari Google Drive
  const loadPhotos = useCallback(async (driveLink) => {
    setPhotosLoading(true)
    setDriveError(null)
    try {
      const folderId = extractFolderId(driveLink)
      if (!folderId) throw new Error('Format link Google Drive tidak dikenali')
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
      if (!apiKey) throw new Error('API Key belum dikonfigurasi. Hubungi fotografer.')
      const files = await loadAllDrivePhotos(folderId, apiKey)
      if (!files.length) {
        setDriveError('Tidak ada foto dalam folder ini. Pastikan folder Drive berisi foto dan diset publik.')
      } else {
        setPhotos(files)
      }
    } catch (err) {
      console.error('[Drive]', err)
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

  // ── Load session
  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/sessions/${id}`)
        setSession(data)
        setSubmitted(data.submitted)

        if (data.submitted) {
          // Sudah submit — tampilkan dari DB
          if (data.selections?.length) setSelected(data.selections)
        } else {
          // Belum submit — restore dari localStorage jika ada
          const lsSaved = localStorage.getItem(`fg_sel_${id}`)
          if (lsSaved) {
            try { setSelected(JSON.parse(lsSaved)) } catch { /* korup, abaikan */ }
          } else if (data.selections?.length) {
            setSelected(data.selections)
          }
        }

        if (data.driveLink) loadPhotos(data.driveLink)
      } catch (err) {
        setError(err.response?.status === 404
          ? 'Sesi tidak ditemukan. Link mungkin sudah tidak valid.'
          : 'Gagal memuat data. Periksa koneksi internet Anda.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, loadPhotos])

  // ── Simpan pilihan ke localStorage (menggantikan auto-save ke server)
  useEffect(() => {
    if (submitted) return
    if (selected.length > 0) {
      localStorage.setItem(LS_KEY, JSON.stringify(selected))
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }, [selected, submitted, LS_KEY])

  function togglePhoto(photo) {
    const isExpired = session && new Date() > new Date(session.deadline)
    if (submitted || isExpired) return
    const idx = selected.findIndex(s => s.id === photo.id)
    if (idx >= 0) {
      setSelected(p => p.filter(s => s.id !== photo.id))
    } else {
      setSelected(p => [...p, { id: photo.id, name: photo.name }])
    }
  }

  // ── Batal semua pilihan
  function clearAll() {
    if (!selected.length) return
    setSelected([])
    showToast('Semua pilihan dibatalkan', 'info')
  }

  // ── Pilih semua foto
  function selectAll() {
    const isExpired = session && new Date() > new Date(session.deadline)
    if (submitted || isExpired) return
    if (!photos.length) { showToast('Belum ada foto untuk dipilih', 'error'); return }
    const pool = activeTab === 'highlight' ? highlightPhotos : photos
    const alreadyIds = new Set(selected.map(s => s.id))
    const toAdd = pool.filter(p => !alreadyIds.has(p.id))
    if (!toAdd.length) {
      showToast('Semua foto sudah dipilih', 'info')
      return
    }
    const newSelected = [
      ...selected,
      ...toAdd.map(p => ({ id: p.id, name: p.name })),
    ]
    setSelected(newSelected)
    showToast(`${newSelected.length} foto dipilih`, 'success')
  }

  // ── Download semua foto terpilih
  const [downloading, setDownloading] = useState(false)
  async function downloadAll() {
    if (!selected.length) { showToast('Belum ada foto yang dipilih', 'error'); return }
    setDownloading(true)
    showToast(`Menyiapkan download ${selected.length} foto…`, 'info')
    try {
      for (let i = 0; i < selected.length; i++) {
        const photo = selected[i]
        const url = `/api/drive/thumb/${photo.id}?w=1600`
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
        // Jeda kecil antar download agar browser tidak memblokir
        await new Promise(r => setTimeout(r, 300))
      }
      showToast('Semua foto berhasil diunduh! 🎉', 'success')
    } catch (err) {
      showToast('Gagal mengunduh: ' + err.message, 'error')
    } finally {
      setDownloading(false)
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

      // Hapus backup localStorage setelah berhasil submit
      localStorage.removeItem(LS_KEY)

      // Simpan waUrl untuk tombol di halaman sukses
      if (data.waUrl) {
        setWaUrl(data.waUrl)
        // Buka WhatsApp admin otomatis
        window.open(data.waUrl, '_blank')
      }

      showToast('Pilihan berhasil dikonfirmasi! Terima kasih 🎉', 'success')
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal menyimpan', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Tab filtering
  const highlightPhotos = photos.filter(p => p.starred)
  const displayPhotos = activeTab === 'all'       ? photos
                      : activeTab === 'highlight'  ? highlightPhotos
                      : /* selected tab */           photos.filter(p => selected.some(s => s.id === p.id))

  // Index dalam displayPhotos untuk lightbox
  function openLightbox(photo) {
    const idx = displayPhotos.findIndex(p => p.id === photo.id)
    setLbIdx(idx >= 0 ? idx : 0)
  }

  const isDeadlinePassed = session && new Date() > new Date(session.deadline)
  const disabled         = submitted || isDeadlinePassed

  /* ── Render states ── */
  if (loading) return (
    <div className="loading-center cg-min-h-screen">
      <div className="spinner" /><span>Memuat galeri…</span>
    </div>
  )
  if (error) return (
    <div className="cg-centered-page">
      <div className="card cg-error-card">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" className="cg-mb-16">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <circle cx="12" cy="16" r="0.5" fill="var(--red)"/>
        </svg>
        <h2 className="cg-mb-8">Oops!</h2>
        <p className="cg-text-color2">{error}</p>
      </div>
    </div>
  )
  if (submitted) return (
    <div className="cg-centered-page">
      <div className="card cg-success-card">
        <div className="cg-success-icon-box">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="cg-success-title">Terima Kasih!</h1>
        <p className="cg-success-desc">
          Pilihan {session?.clientName} sudah kami terima. Kami akan segera memproses foto-foto pilihan Anda.
        </p>
        <div className="cg-success-stats">
          <p className="text-sm text-dim">Total foto dipilih:</p>
          <p className="cg-success-stats-val">{selected.length} foto</p>
        </div>

        {/* Tombol WhatsApp admin — muncul jika waUrl tersedia */}
        {waUrl && (
          <div className="cg-mb-20">
            <p className="text-sm text-dim cg-mb-10">
              Notifikasi dikirim otomatis ke fotografer via WhatsApp.
            </p>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gold cg-wa-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
</svg>
Kirim Ulang ke WhatsApp Fotografer
</a>
</div>
)}

<p className="text-sm text-dim cg-mb-24">Hubungi fotografer jika ada pertanyaan.</p>

{/* Tombol lihat album */}
<button
className="btn btn-gold cg-view-album-btn"
onClick={() => navigate(`/session/${id}/album`)}
>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
<circle cx="12" cy="13" r="4"/>
</svg>
✨ Lihat Album Foto Anda
</button>
</div>
</div>
)
if (isDeadlinePassed && !submitted) return (
<div className="cg-centered-page">
<div className="card cg-error-card">
<div className="cg-timeout-icon-box">
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5">
<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
</svg>
</div>
<h2 className="cg-mb-8">Waktu Habis</h2>
<p className="cg-text-color2">Batas waktu pemilihan foto sudah berakhir. Hubungi fotografer.</p>
</div>
</div>
)

return (
<div className="page-wrap cg-pb-100">

{/* Lightbox */}
{lbIdx !== null && displayPhotos.length > 0 && (
<Lightbox
photos={displayPhotos}
startIdx={lbIdx}
selected={selected}
onToggle={togglePhoto}
onClose={() => setLbIdx(null)}
disabled={disabled}
/>
)}

{/* Header */}
<header className="cg-page-header">
<div className="cg-header-inner">
<div className="cg-header-title-box">
<div className="cg-eyebrow">
Album Foto
</div>
<h1 className="cg-client-name">
{session?.clientName}
</h1>
</div>

{/* Countdown */}
<div className="cg-timer-box">
<div className="text-xs text-dim cg-timer-label">⏳ Batas waktu memilih</div>
<Countdown deadline={session?.deadline} />
</div>

{/* Tabs */}
<TabBar
active={activeTab}
onChange={setActiveTab}
total={photos.length}
highlights={highlightPhotos.length}
selected={selected.length}
/>
</div>
</header>

{/* Gallery */}
{photosLoading ? (
<div className="loading-center cg-min-h-60">
<div className="spinner" /><span>Memuat foto dari Google Drive…</span>
</div>
) : driveError ? (
<div className="loading-center cg-error-state">
<div className="cg-error-icon">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5">
<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
<circle cx="12" cy="16" r="0.5" fill="var(--red)"/>
</svg>
</div>
<div>
<p className="cg-error-title">Gagal Memuat Foto</p>
<p className="cg-error-desc">{driveError}</p>
</div>
<button className="btn btn-ghost btn-sm" onClick={() => session?.driveLink && loadPhotos(session.driveLink)}>
Coba Lagi
</button>
</div>
) : displayPhotos.length === 0 ? (
<div className="loading-center cg-empty-state">
<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1">
<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
<circle cx="12" cy="13" r="4"/>
</svg>
<p className="cg-text-color3">
{activeTab === 'highlight' ? 'Belum ada foto highlight. Tandai foto dengan ⭐ di Google Drive.' :
activeTab === 'selected'  ? 'Belum ada foto yang dipilih.' :
'Tidak ada foto.'}
</p>
{activeTab !== 'all' && (
<button className="btn btn-ghost btn-sm" onClick={() => setActiveTab('all')}>
Lihat Semua Foto
</button>
)}
</div>
) : (
<div className="masonry cg-masonry-pad">
{displayPhotos.map(photo => {
const isSelected = selected.some(s => s.id === photo.id)
const order = selected.findIndex(s => s.id === photo.id) + 1
return (
<PhotoCard
key={photo.id}
photo={photo}
isSelected={isSelected}
selectionOrder={order > 0 ? order : ''}
onToggle={togglePhoto}
onZoom={() => openLightbox(photo)}
disabled={disabled}
/>
)
})}
</div>
)}

{/* Selection bar */}
<div className="selection-bar">
<div className="sel-count">
<div className="sel-count-num">
{selected.length}
</div>
<div className="sel-count-label">foto dipilih</div>
</div>

{/* Action buttons */}
<div className="cg-selbar-actions">
{/* Batal Pilih */}
{!disabled && (
<button
className="btn btn-ghost cg-selbar-btn"
onClick={clearAll}
disabled={!selected.length}
title="Batal semua pilihan"
>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
</svg>
Batal Pilih
</button>
)}

{/* Pilih Semua */}
{!disabled && (
<button
className="btn btn-ghost cg-selbar-btn"
onClick={selectAll}
title="Pilih semua foto"
>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<rect x="3" y="3" width="18" height="18" rx="3"/>
<polyline points="9 12 11 14 15 10"/>
</svg>
Pilih Semua
</button>
)}

{/* Download */}
<button
className="btn cg-selbar-btn cg-btn-download"
onClick={downloadAll}
disabled={downloading || !selected.length}
title="Download semua foto terpilih"
>
{downloading
? <><div className="spinner spinner-sm" /> Mengunduh…</>
: <>
<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
<polyline points="7 10 12 15 17 10"/>
<line x1="12" y1="15" x2="12" y2="3"/>
</svg>
Download ({selected.length})
</>
}
</button>

{/* Selesai Memilih */}
<button
className="btn btn-gold cg-flex-shrink-0"
onClick={handleSubmit}
disabled={disabled || !selected.length || submitting}
>
{submitting
  ? <><div className="spinner spinner-sm" /> Menyimpan…</>
  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    Selesai Memilih</>
}
</button>
</div>
</div>
</div>
)
}
