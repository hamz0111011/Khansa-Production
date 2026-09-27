import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { getAuthPayload } from '@/lib/auth'

export async function GET(req) {
  try {
    const payload = getAuthPayload(req)
    if (!payload) return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 })

    const { data: user } = await supabase
      .from('users')
      .select('id, username, name, whatsapp')
      .eq('id', payload.uid)
      .single()

    if (!user) return NextResponse.json({ message: 'Akun tidak ditemukan' }, { status: 404 })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ message: 'Gagal mengambil data user' }, { status: 500 })
  }
}
