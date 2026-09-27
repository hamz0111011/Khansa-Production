import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// POST /api/sessions/:id/submit — Konfirmasi pilihan foto (PUBLIC)
export async function POST(req, { params }) {
  try {
    const { id } = await params
    const { selections } = await req.json()

    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
      }
      throw fetchErr
    }

    if (new Date() > new Date(session.deadline)) {
      return NextResponse.json({ error: 'Batas waktu sudah habis' }, { status: 403 })
    }
    if (session.submitted) {
      return NextResponse.json({ error: 'Sudah dikonfirmasi sebelumnya' }, { status: 403 })
    }
    if (!selections || selections.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal 1 foto' }, { status: 400 })
    }

    const submittedAt = new Date().toISOString()

    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ selections, submitted: true, submitted_at: submittedAt })
      .eq('id', id)

    if (updateErr) throw updateErr

    const adminWa = process.env.ADMIN_WHATSAPP
    let waUrl = null

    if (adminWa && adminWa !== '628xxxxxxxxxx') {
      const deadlineStr = new Date(session.deadline).toLocaleString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      const submittedStr = new Date(submittedAt).toLocaleString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fotografer.vercel.app'
      const sessionUrl = `${siteUrl}/session/${id}`
      const lines = [
        `📸 *KONFIRMASI PILIHAN FOTO*`,
        ``,
        `Klien   : *${session.client_name}*`,
        `Total   : *${selections.length} foto*`,
        `Dikirim : ${submittedStr}`,
        ``,
        `📋 *Daftar Foto yang Dipilih:*`,
        ...selections.map((s, i) => {
          const raw = s.name || s.id
          const numOnly = raw.replace(/\.[^.]+$/, '').replace(/^[A-Za-z_-]+/, '').trim() || raw
          return `  ${i + 1}. ${numOnly}`
        }),
        ``,
        `🌐 *Link Galeri Klien:*`,
        sessionUrl,
        ``,
        `_Pesan ini dikirim otomatis dari sistem._`,
      ]
      waUrl = `https://wa.me/${adminWa}?text=${encodeURIComponent(lines.join('\n'))}`
    }

    return NextResponse.json({ success: true, submittedAt, waUrl })
  } catch (err) {
    console.error('[POST /api/sessions/:id/submit]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
