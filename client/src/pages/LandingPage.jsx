import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/Logo_khansa.png'
import rollFilm from '../assets/roll_foto.png'
import './LandingPage.css'

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
    <div className={`lp-faq-item ${open ? 'open' : 'closed'}`}>
      <button className="lp-faq-btn" onClick={() => setOpen(v => !v)}>
        <span className="lp-faq-q-text">
          <span className="lp-faq-q-num">
            {String(index + 1).padStart(2, '0')}
          </span>
          {q}
        </span>
        <span className={`lp-faq-icon ${open ? 'open' : 'closed'}`}>+</span>
      </button>
      <div className={`lp-faq-ans-wrap ${open ? 'open' : 'closed'}`}>
        <p className="lp-faq-ans-text">{a}</p>
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
    }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={className} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

const FAQS = [
  {
    q: 'Bagaimana cara saya melihat dan memilih foto hasil pemotretan?',
    a: 'Fotografer akan mengirimkan link galeri pribadi kepada Anda melalui WhatsApp setelah sesi pemotretan selesai diproses. Anda cukup klik link tersebut, kemudian pilih foto favorit Anda sesuai dengan paket yang dipilih.',
  },
  {
    q: 'Berapa lama waktu yang diberikan untuk memilih foto?',
    a: 'Biasanya Anda diberikan waktu 3–7 hari untuk memilih foto. Batas waktu tepat akan tertera di halaman galeri Anda. Jika membutuhkan perpanjangan waktu, silakan hubungi fotografer.',
  },
  {
    q: 'Berapa banyak foto yang bisa saya pilih?',
    a: 'Jumlah foto yang dapat dipilih tergantung pada paket yang Anda ambil. Batas maksimal akan tertera jelas di halaman galeri Anda. Jika ingin menambah kuota foto, bisa dikomunikasikan langsung dengan fotografer.',
  },
  {
    q: 'Apakah saya bisa mengubah pilihan foto setelah dikonfirmasi?',
    a: 'Setelah Anda menekan tombol "Konfirmasi Pilihan", pilihan foto sudah bersifat final dan tidak dapat diubah. Pastikan Anda sudah benar-benar yakin sebelum mengkonfirmasi.',
  },
  {
    q: 'Kapan foto yang sudah diedit akan siap diterima?',
    a: 'Proses editing biasanya memerlukan waktu 7–14 hari kerja setelah pilihan foto dikonfirmasi. Untuk paket tertentu (express), bisa lebih cepat. Fotografer akan mengabari Anda melalui WhatsApp ketika foto siap.',
  },
  {
    q: 'Format file apa yang akan saya terima?',
    a: 'Foto yang sudah diedit akan dikirimkan dalam format JPEG resolusi tinggi melalui Google Drive. Anda bisa langsung mengunduh, mencetak, atau membagikannya sesuai kebutuhan.',
  },
  {
    q: 'Apakah ada biaya tambahan untuk proses pemilihan foto ini?',
    a: 'Tidak ada biaya tambahan. Fasilitas galeri online ini sudah termasuk dalam paket pemotretan yang Anda pilih.',
  },
]

const PHOTOGRAPHERS = [
  {
    name: 'Azmi Ardiansyah',
    role: 'Lead Photographer & Creative Director',
    specialty: 'Wedding • Prewedding • Portrait',
    bio: 'Dengan pengalaman lebih dari 7 tahun di industri fotografi, Khansa mengkhususkan diri dalam mengabadikan momen pernikahan dan keluarga dengan sentuhan sinematik yang hangat dan penuh emosi.',
    icon: '📷',
    stats: { sessions: 300, years: 7, events: 150 },
  },
  {
    name: 'Tim Khansa Project',
    role: 'Professional Photography Team',
    specialty: 'Maternity • Newborn • Family',
    bio: 'Tim kami terdiri dari fotografer-fotografer berpengalaman yang berdedikasi penuh untuk memastikan setiap momen berharga Anda diabadikan dengan sempurna dan penuh cinta.',
    icon: '🎞️',
    stats: { sessions: 500, years: 5, events: 200 },
  },
]

export default function LandingPage() {
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
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
    const msg = encodeURIComponent(
      `Halo Khansa Project! 👋\n\nNama: ${contactForm.name}\nNo. HP: ${contactForm.phone}\n\nPesan:\n${contactForm.message}`
    )
    window.open(`https://wa.me/6281534137376?text=${msg}`, '_blank')
    setContactSent(true)
    setTimeout(() => setContactSent(false), 4000)
    setContactForm({ name: '', phone: '', message: '' })
  }

  const navLinks = [
    { id: 'fotografer', label: 'Fotografer' },
    { id: 'kontak', label: 'Kontak' },
    { id: 'faq', label: 'FAQ' },
  ]

  return (
    <div className="lp-main-container">


      {/* Grain overlay */}
      <div className="lp-grain" />

      {/* ═══════════ NAVBAR ═══════════ */}
      <header className={`lp-header ${scrolled ? 'scrolled' : 'transparent'}`}>
        <div className="lp-header-inner">

          {/* Logo */}
          <button onClick={() => scrollTo('home')} className="lp-logo-btn">
            <div className="lp-logo-box">
              <img src={logo} alt="Khansa Project" className="lp-logo-img" />
            </div>
            <span className="lp-logo-text">
              Khansa <span className="lp-logo-text-highlight">Project</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="lp-nav-desktop lp-nav-desktop-container">
            {navLinks.map(l => (
              <button key={l.id} className="lp-nav-link" onClick={() => scrollTo(l.id)}>{l.label}</button>
            ))}
          </nav>

          {/* CTA Button + Hamburger */}
          <div className="lp-header-actions">
            <button className="lp-btn-gold lp-login-btn"
              onClick={() => nav('/login')}>
              Admin Login
            </button>
            {/* Hamburger */}
            <button
              className="lp-hamburger lp-hamburger-btn"
              onClick={() => setMenuOpen(v => !v)}
            >
              {[0, 1, 2].map(i => (
                <span key={i} className={`lp-hamburger-line line-${i} ${menuOpen ? 'open' : ''}`} />
              ))}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`lp-mobile-menu ${menuOpen ? 'open' : 'closed'}`}>
          <div className="lp-mobile-menu-inner">
            {navLinks.map(l => (
              <button key={l.id} className="lp-nav-link lp-mobile-nav-link"
                onClick={() => scrollTo(l.id)}>{l.label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* ═══════════ HERO ═══════════ */}
      <section id="home" className="lp-hero-section">

        {/* Decorative blobs */}
        <div className="lp-hero-blob-1" />
        <div className="lp-hero-blob-2" />

        <div className="lp-hero-content">
          <div className="lp-hero-layout">
            <div className="lp-hero-text-column">
              {/* Tag */}
              <div className="lp-hero-tag-wrap">
                <span className="lp-section-tag">✦ Khansa Project Photography</span>
              </div>

              {/* Headline */}
              <h1 className="lp-hero-title">
                Mengabadikan<br />
                <span className="lp-hero-title-italic">Setiap Momen</span><br />
                Berharga Anda
              </h1>

          <p className="lp-hero-desc">
            Studio fotografi profesional yang melayani sesi pernikahan, prewedding, keluarga, dan potret — dengan sistem galeri online khusus untuk klien kami.
          </p>

          <div className="lp-hero-actions">
            <button className="lp-btn-gold" onClick={() => scrollTo('kontak')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z" /></svg>
              Hubungi Kami
            </button>
            <button className="lp-btn-ghost" onClick={() => scrollTo('fotografer')}>
              Lihat Fotografer
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>

            </div>
            
            <div className="lp-hero-image-column">
              <FadeIn delay={400}>
                <img src={rollFilm} alt="Roll Film" className="lp-hero-main-image" />
              </FadeIn>
            </div>
          </div>

          {/* Stats Bar */}
          <FadeIn delay={200} className="lp-stats-container">
            <div className="lp-stats-grid">
              {[
                { val: 500, suf: '+', label: 'Sesi Terlayani' },
                { val: 7, suf: '+ Tahun', label: 'Pengalaman' },
                { val: 98, suf: '%', label: 'Klien Puas' },
                { val: 150, suf: '+', label: 'Momen Pernikahan' },
              ].map((s, i) => (
                <div key={i} className={`lp-stat-item ${i < 3 ? 'has-border' : ''}`}>
                  <div className="lp-stat-val">
                    <Counter target={s.val} suffix={s.suf} />
                  </div>
                  <div className="lp-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>

        {/* Scroll cue */}
        <div className="lp-scroll-cue">
          <span className="lp-scroll-text">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      </section>

      {/* ═══════════ FOTOGRAFER ═══════════ */}
      <section id="fotografer" className="lp-fotografer-section">
        <FadeIn>
          <div className="lp-section-header">
            <span className="lp-section-tag">📷 Tim Kami</span>
            <h2 className="lp-section-title">
              Kenali <span className="lp-section-title-italic">Fotografer</span> Kami
            </h2>
            <p className="lp-section-desc">
              Didedikasikan untuk menghasilkan karya terbaik — setiap jepretan adalah cerita yang menunggu untuk diabadikan.
            </p>
          </div>
        </FadeIn>

        <div className="lp-photo-grid">
          {PHOTOGRAPHERS.map((p, i) => (
            <FadeIn key={i} delay={i * 150}>
              <div className="lp-card">
                <div className="lp-photog-header">
                  <div className="lp-photog-icon">
                    {p.icon}
                  </div>
                  <div>
                    <div className="lp-photog-name">{p.name}</div>
                    <div className="lp-photog-role">{p.role}</div>
                  </div>
                </div>
                <div className="lp-photog-specialty">
                  {p.specialty}
                </div>
                <p className="lp-photog-bio">{p.bio}</p>
                <div className="lp-photog-stats">
                  {[
                    { val: p.stats.sessions, label: 'Sesi' },
                    { val: p.stats.years, label: 'Tahun' },
                    { val: p.stats.events, label: 'Acara' },
                  ].map((st, j) => (
                    <div key={j} className="lp-photog-stat-item">
                      <div className="lp-photog-stat-val">{st.val}+</div>
                      <div className="lp-photog-stat-label">{st.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Services */}
        <FadeIn delay={100}>
          <div className="lp-services-header">
            <h3 className="lp-services-title">Layanan <span className="lp-services-title-highlight">Kami</span></h3>
          </div>
          <div className="lp-services-grid">
            {[
              { icon: '💍', title: 'Wedding', desc: 'Mengabadikan hari istimewa pernikahan Anda' },
              { icon: '🌹', title: 'Prewedding', desc: 'Sesi foto romantis sebelum hari pernikahan' },
              { icon: '👨‍👩‍👧', title: 'Family', desc: 'Kenangan indah bersama keluarga tercinta' },
              { icon: '🤱', title: 'Maternity', desc: 'Mengabadikan keindahan masa kehamilan' },
              { icon: '👶', title: 'Newborn', desc: 'Momen berharga si kecil yang baru lahir' },
              { icon: '🎓', title: 'Wisuda', desc: 'Rayakan pencapaian luar biasa Anda' },
            ].map((s, i) => (
              <div key={i} className="lp-service-card">
                <div className="lp-service-icon">{s.icon}</div>
                <div className="lp-service-title">{s.title}</div>
                <div className="lp-service-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="lp-how-section">
        <div className="lp-how-container">
          <FadeIn>
            <div className="lp-how-header">
              <span className="lp-section-tag">✦ Cara Kerja</span>
              <h2 className="lp-how-title">
                Proses <span className="lp-section-title-italic">Sederhana</span>, Hasil Maksimal
              </h2>
            </div>
          </FadeIn>
          <div className="lp-how-grid">
            {[
              { step: '01', icon: '📞', title: 'Hubungi Kami', desc: 'Konsultasikan kebutuhan dan jadwal sesi foto Anda melalui WhatsApp.' },
              { step: '02', icon: '📸', title: 'Sesi Pemotretan', desc: 'Fotografer kami datang ke lokasi dan mengabadikan momen Anda.' },
              { step: '03', icon: '🖥️', title: 'Pilih Foto Online', desc: 'Anda menerima link galeri online pribadi untuk memilih foto favorit.' },
              { step: '04', icon: '✨', title: 'Terima Hasil Edit', desc: 'Foto yang dipilih akan diedit dan dikirimkan ke Google Drive Anda.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 120}>
                <div className="lp-how-card">
                  <div className="lp-how-icon">
                    {s.icon}
                  </div>
                  <div className="lp-how-step">{s.step}</div>
                  <div className="lp-how-title-text">{s.title}</div>
                  <p className="lp-how-desc">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ KONTAK ═══════════ */}
      <section id="kontak" className="lp-kontak-section">
        <FadeIn>
          <div className="lp-kontak-header">
            <span className="lp-section-tag">📱 Hubungi Kami</span>
            <h2 className="lp-kontak-title">
              Siap <span className="lp-section-title-italic">Bekerja Sama</span> dengan Anda
            </h2>
            <p className="lp-kontak-desc">
              Ceritakan momen apa yang ingin Anda abadikan. Kami siap membantu mewujudkannya.
            </p>
          </div>
        </FadeIn>

        <div className="lp-contact-grid">
          {/* Contact Info */}
          <FadeIn delay={100}>
            <div className="lp-contact-info-list">
              {[
                { icon: '📱', label: 'WhatsApp', value: '+62 815-3413-7376', link: 'https://wa.me/6281534137376' },
                { icon: '📍', label: 'Lokasi', value: 'Indonesia', link: null },
                { icon: '🕐', label: 'Jam Operasional', value: 'Setiap hari, 08.00 – 20.00 WIB', link: null },
              ].map((c, i) => (
                <div key={i} className="lp-contact-info-card">
                  <div className="lp-contact-info-inner">
                    <div className="lp-contact-info-icon">
                      {c.icon}
                    </div>
                    <div>
                      <div className="lp-contact-info-label">{c.label}</div>
                      {c.link
                        ? <a href={c.link} target="_blank" rel="noopener noreferrer" className="lp-contact-info-link">{c.value}</a>
                        : <div className="lp-contact-info-value">{c.value}</div>
                      }
                    </div>
                  </div>
                </div>
              ))}

              {/* Social / WA CTA */}
              <a
                href="https://wa.me/6281534137376"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn-gold lp-wa-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" /></svg>
                Chat WhatsApp Sekarang
              </a>
            </div>
          </FadeIn>

          {/* Contact Form */}
          <FadeIn delay={200}>
            <div className="lp-card lp-contact-form-card">
              <h3 className="lp-form-title">Kirim Pesan</h3>
              <p className="lp-form-desc">Isi form ini dan kami akan membalasnya via WhatsApp.</p>

              {contactSent && (
                <div className="lp-form-success">
                  ✓ Pesan terkirim! Kami akan segera menghubungi Anda.
                </div>
              )}

              <form onSubmit={handleContact} className="lp-form">
                <div>
                  <label className="lp-form-label">Nama Lengkap *</label>
                  <input className="lp-input" placeholder="Nama Anda" required value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="lp-form-label">Nomor WhatsApp *</label>
                  <input className="lp-input" placeholder="08xx / +62xx" required value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="lp-form-label">Pesan / Kebutuhan *</label>
                  <textarea className="lp-input lp-form-textarea" rows={4} placeholder="Ceritakan momen yang ingin diabadikan, tanggal rencana, dan pertanyaan Anda..." required value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} />
                </div>
                <button type="submit" className="lp-btn-gold lp-submit-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  Kirim via WhatsApp
                </button>
              </form>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="lp-faq-section">
        <div className="lp-faq-container">
          <FadeIn>
            <div className="lp-faq-header">
              <span className="lp-section-tag">❓ FAQ</span>
              <h2 className="lp-faq-title">
                Pertanyaan <span className="lp-section-title-italic">yang Sering</span> Ditanyakan
              </h2>
              <p className="lp-faq-desc">
                Tidak menemukan jawaban yang Anda cari? Hubungi kami langsung via WhatsApp.
              </p>
            </div>
          </FadeIn>

          <div className="lp-faq-list">
            {FAQS.map((f, i) => (
              <FadeIn key={i} delay={i * 60}>
                <FaqItem q={f.q} a={f.a} index={i} />
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={200}>
            <div className="lp-faq-footer">
              <p className="lp-faq-footer-text">Masih ada pertanyaan lain?</p>
              <a href="https://wa.me/6281534137376" target="_blank" rel="noopener noreferrer" className="lp-btn-ghost lp-faq-ask-btn">
                Tanya Langsung ke Kami →
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-container">
          <div className="lp-footer-brand">
            <div className="lp-footer-logo">
              <img src={logo} alt="Logo" className="lp-footer-logo-img" />
            </div>
            <span className="lp-footer-brand-text">
              Khansa <span className="lp-footer-brand-highlight">Project</span>
            </span>
          </div>
          <p className="lp-footer-copy">
            © {new Date().getFullYear()} Khansa Project. Dibuat dengan ♥ untuk mengabadikan kenangan.
          </p>
          <button onClick={() => nav('/login')} className="lp-footer-admin-btn">
            Admin →
          </button>
        </div>
      </footer>
    </div>
  )
}
