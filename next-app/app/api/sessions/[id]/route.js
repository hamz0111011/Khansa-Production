import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { getAuthPayload } from '@/lib/auth'
import { toClient } from '@/lib/sessions'

// GET /api/sessions/:id — Detail sesi (PUBLIC untuk klien)
export async function GET(req, { params }) {
  try {
    const { id } = await params
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
      }
      throw error
    }
    return NextResponse.json(toClient(data))
  } catch (err) {
    console.error('[GET /api/sessions/:id]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH /api/sessions/:id — Update deadline dan/atau maxPhotos (butuh auth + ownership)
export async function PATCH(req, { params }) {
  try {
    const payload = getAuthPayload(req)
    if (!payload) return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 })

    const { id } = await params
    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('photographer_id')
      .eq('id', id)
      .single()

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
      }
      throw fetchErr
    }

    if (session.photographer_id !== payload.uid) {
      return NextResponse.json({ error: 'Tidak berhak mengubah sesi ini' }, { status: 403 })
    }

    const body = await req.json()
    const updateFields = {}
    if (body.deadline !== undefined) updateFields.deadline = body.deadline
    if (body.maxPhotos !== undefined) updateFields.max_photos = Number(body.maxPhotos)

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang diubah' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sessions')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(toClient(data))
  } catch (err) {
    console.error('[PATCH /api/sessions/:id]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/sessions/:id — Hapus sesi (butuh auth + ownership)
export async function DELETE(req, { params }) {
  try {
    const payload = getAuthPayload(req)
    if (!payload) return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 })

    const { id } = await params
    const { data: session, error: fetchErr } = await supabase
      .from('sessions')
      .select('photographer_id')
      .eq('id', id)
      .single()

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
      }
      throw fetchErr
    }

    if (session.photographer_id !== payload.uid) {
      return NextResponse.json({ error: 'Tidak berhak menghapus sesi ini' }, { status: 403 })
    }

    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/sessions/:id]', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
