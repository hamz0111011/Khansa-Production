import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { getAuthPayload, verifyPassword, hashPassword } from '@/lib/auth'

export async function POST(req) {
  try {
    const payload = getAuthPayload(req)
    if (!payload) return NextResponse.json({ message: 'Tidak terautentikasi' }, { status: 401 })

    const { currentPassword, newPassword } = await req.json()
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Password lama dan baru wajib diisi' }, { status: 400 })
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ message: 'Password baru minimal 6 karakter' }, { status: 400 })
    }

    const { data: user, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.uid)
      .single()

    if (fetchErr || !user) return NextResponse.json({ message: 'Akun tidak ditemukan' }, { status: 404 })
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ message: 'Password saat ini salah' }, { status: 401 })
    }

    const { error: updateErr } = await supabase
      .from('users')
      .update({ password_hash: hashPassword(newPassword) })
      .eq('id', user.id)

    if (updateErr) throw updateErr
    return NextResponse.json({ success: true, message: 'Password berhasil diubah' })
  } catch (err) {
    console.error('[POST /api/auth/change-password]', err.message)
    return NextResponse.json({ message: 'Gagal mengubah password' }, { status: 500 })
  }
}
