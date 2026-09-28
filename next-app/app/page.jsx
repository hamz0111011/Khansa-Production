'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

/* ── Animated number counter ── */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0)
  const ref = useRef()
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const step = target / 60
      const timer = setInterval(() => {
        start += step
        if (start >= target) { setCount(target); clearInterval(timer) }
        else setCount(Math.floor(start))
      }, 16)
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{count}{suffix}</span>
}

/* ── FAQ Item ── */
function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`v2-faq-item ${open ? 'open' : ''}`}>
      <button className="v2-faq-btn" onClick={() => setOpen(v => !v)}>
        <span className="v2-faq-q">{q}</span>
        <span className={`v2-faq-arrow ${open ? 'open' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div className={`v2-faq-answer ${open ? 'open' : ''}`}>
        <p className="v2-faq-ans-text">{a}</p>
      </div>
    </div>
  )
}

/* ── Fade-in section wrapper ── */
function FadeIn({ children, delay = 0, style = {}, className = '' }) {
  const ref = useRef()
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect() }
    }, { threshold: 0.08 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

const FAQS = [
  { q: 'Bagaimana cara saya melihat dan memilih foto hasil pemotretan?', a: 'Fotografer akan mengirimkan link website kepada Anda melalui WhatsApp setelah sesi pemotretan selesai diproses. Anda cukup klik link tersebut, kemudian pilih foto favorit Anda sesuai dengan paket yang dipilih.' },
  { q: 'Berapa lama waktu yang diberikan untuk memilih foto?', a: 'Biasanya Anda diberikan waktu 3–7 hari untuk memilih foto. Batas waktu tepat akan tertera di halaman galeri Anda. Jika membutuhkan perpanjangan waktu, silakan hubungi fotografer.' },
  { q: 'Berapa banyak foto yang bisa saya pilih?', a: 'Jumlah foto yang dapat dipilih tergantung pada paket yang Anda ambil. Batas maksimal akan tertera jelas di halaman galeri Anda.' },
  { q: 'Apakah saya bisa mengubah pilihan foto setelah dikonfirmasi?', a: 'Setelah Anda menekan tombol "Konfirmasi Pilihan", pilihan foto sudah bersifat final dan tidak dapat diubah. Pastikan Anda sudah benar-benar yakin sebelum mengkonfirmasi.' },
  { q: 'Kapan foto yang sudah diedit akan siap diterima?', a: 'Proses editing biasanya memerlukan waktu 7–14 hari kerja setelah pilihan foto dikonfirmasi.' },
  { q: 'Format file apa yang akan saya terima?', a: 'Foto yang sudah diedit akan dikirimkan dalam format JPEG resolusi tinggi melalui Google Drive.' },
  { q: 'Apakah ada biaya tambahan untuk proses pemilihan foto ini?', a: 'Tidak ada biaya tambahan. Fasilitas galeri online ini sudah termasuk dalam paket pemotretan yang Anda pilih.' },
]

const SERVICES = [
  { img: '/desain-tanpa-judul.png', title: 'Wedding', desc: 'Mengabadikan hari istimewa pernikahan Anda dengan penuh keindahan dan cinta.' },
  { img: '/wisuda.png', title: 'Wisuda', desc: 'Rayakan pencapaian akademis Anda dengan foto kenangan yang berkesan.' },
  { img: '/newborn.png', title: 'Newborn', desc: 'Momen berharga si kecil yang baru lahir, diabadikan dengan lembut.' },
  { img: '/family.png', title: 'Family', desc: 'Kenangan indah bersama keluarga tercinta yang tak ternilai harganya.' },
  { img: '/prewedding.png', title: 'Prewedding', desc: 'Sesi foto romantis sebelum hari pernikahan bersama pasangan.' },
  { img: '/event.png', title: 'Event', desc: 'Dokumentasi acara profesional untuk setiap momen spesial Anda.' },
]

const HOW_STEPS = [
  { img: '/hubungi-kami.png', step: '01', title: 'Hubungi Kami', desc: 'Konsultasikan kebutuhan dan jadwal sesi foto Anda melalui WhatsApp.' },
  { img: '/sesi-potret.png', step: '02', title: 'Sesi Pemotretan', desc: 'Fotografer kami datang ke lokasi dan mengabadikan momen Anda.' },
  { img: '/pilih-foto.png', step: '03', title: 'Pilih Foto Online', desc: 'Anda menerima link galeri online pribadi untuk memilih foto favorit.' },
  { img: '/hasil-edit.png', step: '04', title: 'Terima Hasil Edit', desc: 'Foto yang dipilih akan diedit dan dapat dilihat di link website yang diberikan melalui WhatsApp.' },
]

export default function LandingPage() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' })
  const [contactSent, setContactSent] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTo(id) {
    setMenuOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleContact(e) {
    e.preventDefault()
    const msg = encodeURIComponent(`Halo Khansa Project! 👋\n\nNama: ${contactForm.name}\nNo. HP: ${contactForm.phone}\n\nPesan:\n${contactForm.message}`)
    window.open(`https://wa.me/6281534137376?text=${msg}`, '_blank')
    setContactSent(true)
    setTimeout(() => setContactSent(false), 4000)
    setContactForm({ name: '', phone: '', message: '' })
  }

  const navLinks = [
    { id: 'layanan', label: 'Services' },
    { id: 'kontak', label: 'Contact' },
    { id: 'faq', label: 'FAQ' },
  ]

  return (
    <div className="v2-page">

      {/* ── NAVBAR ── */}
      <header className={`v2-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="v2-header-inner">
          {/* Logo */}
          <button onClick={() => scrollTo('home')} className="v2-logo-btn">
            <div className="v2-logo-img-wrap">
              <Image src="/logo-khansa-6.png" alt="Khansa Project" width={36} height={36} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <span className="v2-logo-text">Khansa <em>Project</em></span>
          </button>

          {/* Desktop Nav */}
          <nav className="v2-nav-desktop">
            {navLinks.map(l => (
              <button key={l.id} className="v2-nav-link" onClick={() => scrollTo(l.id)}>{l.label}</button>
            ))}
          </nav>

          {/* Actions */}
          <div className="v2-header-actions">
            <button className="v2-btn-primary v2-login-btn" onClick={() => router.push('/login')}>
              Admin Login
            </button>
            <button className="v2-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
              <span className={`v2-ham-line ${menuOpen ? 'open' : ''}`} />
              <span className={`v2-ham-line ${menuOpen ? 'open' : ''}`} />
              <span className={`v2-ham-line ${menuOpen ? 'open' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`v2-mobile-menu ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(l => (
            <button key={l.id} className="v2-mobile-nav-link" onClick={() => scrollTo(l.id)}>{l.label}</button>
          ))}
          <button className="v2-mobile-admin-btn" onClick={() => { setMenuOpen(false); router.push('/login') }}>
            Admin Login
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="home" className="v2-hero">
        <div className="v2-hero-inner">
          {/* Text */}
          <div className="v2-hero-text">
            <div className="v2-hero-tag">✦ Khansa Project Photography</div>
            <h1 className="v2-hero-title">
              Mengabadikan<br />
              <em className="v2-hero-em">&ensp;&ensp;Setiap Momen</em><br />
              Berharga Anda
            </h1>
            <p className="v2-hero-desc">
              Studio fotografi profesional yang melayani sesi pernikahan, prewedding, keluarga,
              dan potret — dengan sistem galeri online khusus untuk klien kami.
            </p>
            <div className="v2-hero-btns">
              <button className="v2-btn-primary" onClick={() => scrollTo('kontak')}>
                Hubungi Kami
              </button>
              <button className="v2-btn-outline" onClick={() => scrollTo('layanan')}>
                Lihat Fotografer
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          {/* Images */}
          <div className="v2-hero-images">
            {/* Dot decorasi kiri atas */}
            <div className="v2-hero-dot-tl" />
            {/* Gambar utama — portrait tinggi, posisi kiri atas */}
            <div className="v2-hero-img-main">
              <Image
                src="/landingpage1.webp"
                alt="Foto Wisuda Kelompok"
                fill
                sizes="(max-width: 768px) 58vw, 260px"
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
                priority
              />
            </div>
            {/* Gambar sekunder — lebih kecil, geser ke bawah */}
            <div className="v2-hero-img-secondary">
              <Image
                src="/landingpage2.png"
                alt="Foto Portrait Wisuda"
                fill
                sizes="(max-width: 768px) 52vw, 230px"
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
                priority
              />
            </div>
            {/* Dot decorasi kanan bawah */}
            <div className="v2-hero-dot-br" />
          </div>
        </div>

        {/* Stats */}
        <div className="v2-stats-bar">
          <div className="v2-stat">
            <div className="v2-stat-num"><Counter target={400} suffix="+" /></div>
            <div className="v2-stat-label">Sesi Terlayani</div>
          </div>
          <div className="v2-stat-divider" />
          <div className="v2-stat">
            <div className="v2-stat-num"><Counter target={98} suffix="%" /></div>
            <div className="v2-stat-label">Klien Puas</div>
          </div>
          <div className="v2-stat-divider" />
          <div className="v2-stat">
            <div className="v2-stat-num"><Counter target={1000} suffix="+" /></div>
            <div className="v2-stat-label">Foto Terkirim</div>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="v2-scroll-cue">
          <span />
        </div>
      </section>

      {/* ── LAYANAN KAMI ── */}
      <section id="layanan" className="v2-section v2-services-section">
        <div className="v2-container">
          <FadeIn>
            <div className="v2-section-head">
              <div className="v2-section-line" />
              <h2 className="v2-section-title">Layanan Kami</h2>
            </div>
          </FadeIn>
          <div className="v2-services-grid">
            {SERVICES.map((s, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="v2-service-card">
                  <div className="v2-service-icon">
                    <Image src={s.img} alt={s.title} width={52} height={52} style={{ objectFit: 'contain' }} />
                  </div>
                  <div className="v2-service-title">{s.title}</div>
                  <div className="v2-service-desc">{s.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROSES SEDERHANA ── */}
      <section className="v2-section v2-how-section">
        <div className="v2-container">
          <FadeIn>
            <div className="v2-section-head">
              <div className="v2-section-line" />
              <h2 className="v2-section-title">Proses Sederhana, Hasil Maksimal</h2>
            </div>
          </FadeIn>
          <div className="v2-how-grid">
            {HOW_STEPS.map((s, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="v2-how-card">
                  <div className="v2-how-icon">
                    <Image src={s.img} alt={s.title} width={44} height={44} style={{ objectFit: 'contain' }} />
                  </div>
                  <div className="v2-how-step">{s.step}</div>
                  <div className="v2-how-title">{s.title}</div>
                  <p className="v2-how-desc">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── TENTANG KAMI ── */}
      <section className="v2-section v2-about-section">
        <div className="v2-container">
          <div className="v2-about-layout">
            <FadeIn className="v2-about-img-col">
              <div className="v2-about-img-wrap">
                <Image
                  src="/tentang-kami.jpg"
                  alt="Tentang Khansa Project"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
            </FadeIn>
            <FadeIn delay={150} className="v2-about-text-col">
              <div className="v2-about-eyebrow">Tentang Kami</div>
              <h2 className="v2-about-title">More Than Just a Photograph.</h2>
              <p className="v2-about-desc">
                Kami adalah tim fotografer profesional yang mengkhususkan diri dalam mengabadikan
                gambar terpenting, dari momen pernikahan yang mengharukan, hingga momen berkumpul
                keluarga yang membahagiakan. Dengan pengalaman bertahun-tahun melayani klien di
                berbagai kota di Indonesia, kami percaya bahwa setiap foto harus bercerita.
              </p>
              <p className="v2-about-desc" style={{ marginTop: 16 }}>
                Dengan layanan galeri online eksklusif, Anda dapat memilih sendiri foto-foto terbaik
                dari sesi pemotretan Anda kapan saja dan di mana saja melalui link pribadi yang kami
                berikan via WhatsApp. Temukan lebih lanjut tentang kami di Google Maps.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── PENDEKATAN KAMI ── */}
      <section className="v2-section v2-approach-section">
        <div className="v2-container">
          <div className="v2-approach-layout">
            <FadeIn className="v2-approach-text-col">
              <h2 className="v2-approach-title">Pendekatan Kami</h2>
              <div className="v2-approach-list">
                {[
                  { num: '1', title: 'Authentic', desc: 'Kami menangkap momen nyata, ekspresi tulus, dan cerita yang benar-benar ada. Tidak ada kepura-puraan.' },
                  { num: '2', title: 'Creative', desc: 'Setiap sesi pemotretan kami rencanakan dengan cermat, dari komposisi, pencahayaan, dan sudut pandang yang unik.' },
                  { num: '3', title: 'Timeless', desc: 'Foto-foto kami dirancang untuk tetap indah dan berkesan bahkan bertahun-tahun setelah momen berlalu.' },
                ].map((item, i) => (
                  <div key={i} className="v2-approach-item">
                    <div className="v2-approach-num">{item.num}</div>
                    <div>
                      <div className="v2-approach-item-title">{item.title}</div>
                      <p className="v2-approach-item-desc">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
            <FadeIn delay={150} className="v2-approach-img-col">
              <div className="v2-approach-img-wrap">
                <Image
                  src="/pendekatan-kami.jpg"
                  alt="Pendekatan Kami"
                  fill
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="v2-section v2-faq-section">
        <div className="v2-container v2-faq-container">
          <FadeIn>
            <div className="v2-section-head v2-faq-head">
              <div className="v2-section-line" />
              <h2 className="v2-section-title">Pertanyaan yang Sering Ditanyakan</h2>
            </div>
          </FadeIn>
          <div className="v2-faq-list">
            {FAQS.map((f, i) => (
              <FadeIn key={i} delay={i * 50}>
                <FaqItem q={f.q} a={f.a} index={i} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA / KONTAK ── */}
      <section id="kontak" className="v2-cta-section">
        <div className="v2-container">
          <FadeIn>
            <div className="v2-cta-inner">
              <p className="v2-cta-sub">Masih ada pertanyaan lain?</p>
              <a
                href="https://wa.me/6283173946838"
                target="_blank"
                rel="noopener noreferrer"
                className="v2-btn-primary v2-cta-btn"
              >
                Tanya Langsung ke Kami →
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="v2-footer">
        <div className="v2-footer-inner">
          {/* Brand */}
          <div className="v2-footer-brand">
            <div className="v2-footer-logo">
              <Image src="/logo-khansa-6.png" alt="Logo" width={36} height={36} style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
            </div>
            <div>
              <div className="v2-footer-name">Khansa Project</div>
              <div className="v2-footer-tagline">Studio Fotografi Profesional</div>
              <div className="v2-footer-contact-row">
                <span>+6282260634686</span>
              </div>
              <div className="v2-footer-contact-row">
                <span>Khansa@fotografer.app</span>
              </div>
              <div className="v2-footer-contact-row">
                <span>Medan-Lhokseumawe-Banda Aceh, Indonesia</span>
              </div>
              <div className="v2-footer-social">
                <a href="https://wa.me/6282260634686" target="_blank" rel="noopener noreferrer" className="v2-social-icon" title="WhatsApp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                </a>
                <a href="https://www.instagram.com/khansa.project_/" className="v2-social-icon" title="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                </a>
                <a href="#" className="v2-social-icon" title="TikTok">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.83 1.54V6.78a4.85 4.85 0 0 1-1.06-.09z" /></svg>
                </a>
                <a href="#" className="v2-social-icon" title="YouTube">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" /></svg>
                </a>
              </div>
            </div>
          </div>

          {/* Links col 1 */}
          <div className="v2-footer-col">
            <div className="v2-footer-col-title">Our Services</div>
            <a href="#" className="v2-footer-link">Wedding</a>
            <a href="#" className="v2-footer-link">Prewedding</a>
            <a href="#" className="v2-footer-link">Family</a>
            <a href="#" className="v2-footer-link">Wisuda</a>
            <a href="#" className="v2-footer-link">Newborn</a>
            <a href="#" className="v2-footer-link">Event</a>
          </div>

          {/* Links col 2 */}
          <div className="v2-footer-col">
            <div className="v2-footer-col-title">Our Services</div>
            <a href="#" className="v2-footer-link">About Us</a>
            <a href="#" className="v2-footer-link">Contact</a>
            <a href="#" className="v2-footer-link">Pricing</a>
            <a href="#" className="v2-footer-link">Artist Sign</a>
          </div>

          {/* Links col 3 */}
          <div className="v2-footer-col">
            <div className="v2-footer-col-title">Our Services</div>
            <a href="#" className="v2-footer-link">Facebook</a>
            <a href="#" className="v2-footer-link">Instagram</a>
            <a href="#" className="v2-footer-link">WhatsApp</a>
            <button onClick={() => router.push('/login')} className="v2-footer-link v2-footer-admin">Admin</button>
          </div>
        </div>

        <div className="v2-footer-bottom">
          <p>© {new Date().getFullYear()} Khansa Project. Dibuat dengan ♥ untuk mengabadikan kenangan.</p>
        </div>
      </footer>
    </div>
  )
}
