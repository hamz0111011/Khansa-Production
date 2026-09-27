'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

function thumbUrl(id, w = 600) { return `/api/drive/thumb/${id}?w=${w}` }
function bigUrl(id)             { return `/api/drive/thumb/${id}?w=1600` }

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)
  const [imgKey, setImgKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const touchStartX = useRef(0)
  const photo = photos[idx]

  useEffect(() => { setLoading(true); setImgKey(k => k + 1) }, [idx])
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }, [])
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft')  go(-1)
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  function go(delta) { const next = idx + delta; if (next >= 0 && next < photos.length) setIdx(next) }
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) { const dx = e.changedTouches[0].clientX - touchStartX.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1) }

  if (!photo) return null

  return (
    <div className="album-lightbox" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="album-lb-top">
        <span className="album-lb-counter">{idx + 1} <span className="av-lb-counter-sep">/</span> {photos.length}</span>
        <div className="av-lb-actions">
          <a href={`https://drive.google.com/file/d/${photo.id}/view`} target="_blank" rel="noopener noreferrer" className="av-lb-drive-btn" title="Buka di Google Drive">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
          <button className="album-lb-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div className="album-lb-img-wrap">
        {loading && <div className="av-lb-loader-wrap"><div className="spinner" /></div>}
        <img key={imgKey} src={bigUrl(photo.id)} alt={photo.name} className="album-lb-img" onLoad={() => setLoading(false)} style={{ opacity: loading ? 0 : 1 }} />
      </div>

      {idx > 0 && <button className="album-lb-nav prev" onClick={() => go(-1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>}
      {idx < photos.length - 1 && <button className="album-lb-nav next" onClick={() => go(1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>}

      <div className="album-lb-filmstrip">
        {photos.map((p, i) => (
          <div key={p.id} className={`album-lb-thumb${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>
            <img src={thumbUrl(p.id, 100)} alt="" />
          </div>
        ))}
      </div>
    </div>
  )
}

function AlbumCard({ photo, index, onZoom }) {
  const ref = useRef()
  const [visible, setVisible] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [src, setSrc] = useState(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => { setVisible(true); setSrc(thumbUrl(photo.id, 800)) }, (index % 6) * 80)
        obs.disconnect()
      }
    }, { rootMargin: '200px' })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [index, photo.id])

  return (
    <div ref={ref} className={`album-card${visible ? ' visible' : ''}`} style={{ transitionDelay: `${(index % 6) * 0.06}s` }} onClick={() => onZoom(index)}>
      <div className="av-card-skeleton" style={{ opacity: loaded ? 0 : 1 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      {src && <img src={src} alt={photo.name} onLoad={() => setLoaded(true)} className="av-card-img" style={{ opacity: loaded ? 1 : 0 }} />}
      <div className="album-card-overlay"><span className="album-card-num">{String(index + 1).padStart(2, '0')}</span></div>
      <div className="album-card-zoom-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></div>
    </div>
  )
}

export default function AlbumViewerPage() {
  const { id } = useParams()
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lbIdx, setLbIdx] = useState(null)
  const [navScrolled, setNavScrolled] = useState(false)
  const galleryRef = useRef()

  useEffect(() => {
    function onScroll() { setNavScrolled(window.scrollY > 60) }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get(`/sessions/${id}`)
        if (!data.submitted) { router.replace(`/session/${id}`); return }
        setSession(data)
      } catch (err) {
        setError(err.response?.status === 404 ? 'Album tidak ditemukan.' : 'Gagal memuat album.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    const btn = document.getElementById('copy-link-btn')
    if (btn) { btn.textContent = '✓ Disalin!'; setTimeout(() => { btn.textContent = 'Salin Link' }, 2000) }
  }

  if (loading) return <div className="loading-center av-loading-page"><div className="spinner" /><span className="av-loading-text">Memuat album…</span></div>
  if (error) return (
    <div className="av-error-page">
      <div className="av-error-content">
        <p className="av-error-text">{error}</p>
        <button className="btn btn-ghost" onClick={() => router.back()}>← Kembali</button>
      </div>
    </div>
  )

  const selections = session?.selections || []
  const heroPhoto = selections[0]
  const waNumber = session?.whatsapp

  return (
    <div className="album-page">
      {lbIdx !== null && (
        <Lightbox photos={selections} startIdx={lbIdx} onClose={() => setLbIdx(null)} />
      )}

      <nav className={`album-nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="av-nav-brand">
          <img src="/Logo_khansa.png" alt="Khansa Project" width={36} height={36} className="av-nav-logo" />
          <span className="av-nav-title">Khansa Project</span>
        </div>
        <div className="av-nav-actions">
          <button id="copy-link-btn" className="btn btn-ghost btn-sm" onClick={copyLink}>Salin Link</button>
          {waNumber && (
            <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm av-wa-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Hubungi Fotografer
            </a>
          )}
        </div>
      </nav>

      {heroPhoto ? (
        <section className="album-hero">
          <img className="album-hero-img" src={bigUrl(heroPhoto.id)} alt="Album cover" />
          <div className="album-hero-overlay" />
          <div className="album-hero-content">
            <div className="album-eyebrow">Koleksi Foto Pilihan</div>
            <h1 className="album-title">{session?.clientName}</h1>
            <div className="album-subtitle">
              {selections.length} foto terpilih &nbsp;·&nbsp; {fmtDate(session?.submittedAt)}
            </div>
            <button className="album-scroll-btn" onClick={() => galleryRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              Lihat Semua Foto
            </button>
          </div>
          <div className="album-hero-dots">
            <div className="album-hero-dot active" /><div className="album-hero-dot" /><div className="album-hero-dot" />
          </div>
        </section>
      ) : (
        <div className="av-hero-placeholder" />
      )}

      <section className="album-section" ref={galleryRef}>
        <div className="album-section-header">
          <div className="album-section-line" />
          <span className="album-section-label">Galeri Pilihan</span>
          <div className="album-count-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            {selections.length} foto
          </div>
          <div className="album-section-line fade-left" />
        </div>

        {selections.length > 0 ? (
          <div className="album-grid">
            {selections.map((photo, i) => (
              <AlbumCard key={photo.id} photo={photo} index={i} onZoom={idx => setLbIdx(idx)} />
            ))}
          </div>
        ) : (
          <div className="loading-center av-empty-state">
            <p className="av-empty-text">Belum ada foto yang dipilih.</p>
          </div>
        )}
      </section>

      <footer className="album-footer">
        <div className="album-footer-logo">Khansa Project</div>
        <div className="album-footer-tagline">Mengabadikan Momen Berharga Anda</div>
        {waNumber && (
          <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Halo! Saya ingin bertanya mengenai foto saya (album: ${typeof window !== 'undefined' ? window.location.href : ''})`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold av-footer-wa-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Hubungi Fotografer
          </a>
        )}
        <p className="av-footer-copy">© {new Date().getFullYear()} Khansa Project · Foto ini dikurasi khusus untuk {session?.clientName}</p>
      </footer>
    </div>
  )
}
