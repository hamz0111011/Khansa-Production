import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { getAuthPayload } from '@/lib/auth'
import { toClient } from '@/lib/sessions'

// GET /api/sessions — List sesi milik fotografer yang login
export async function GET(req) {
  try {
    const payload = getAuthPayload(req)
    if (!payload) return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 })

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('photographer_id', payload.uid)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data.map(toClient))
  } catch (err) {
    console.error('[GET /api/sessions]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST /api/sessions — Buat sesi baru
export async function POST(req) {
  try {
    const payload = getAuthPayload(req)
    if (!payload) return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 })

    const { clientName, driveLink, whatsapp, deadline, maxPhotos } = await req.json()
    if (!clientName || !driveLink || !whatsapp || !deadline) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })
    }

    // Normalisasi nomor WA
    let waNumber = whatsapp.replace(/\D/g, '')
    if (waNumber.startsWith('0'))   waNumber = '62' + waNumber.slice(1)
    if (!waNumber.startsWith('62')) waNumber = '62' + waNumber

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        client_name:     clientName,
        drive_link:      driveLink,
        whatsapp:        waNumber,
        max_photos:      maxPhotos && maxPhotos > 0 ? Number(maxPhotos) : 99999,
        deadline,
        selections:      [],
        submitted:       false,
        photographer_id: payload.uid,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(toClient(data), { status: 201 })

  } catch (err) {
    console.error('[POST /api/sessions]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
