import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { verifyPassword, signToken, ensureDefaultAdmin } from '@/lib/auth'

export async function POST(req) {
  try {
    await ensureDefaultAdmin()
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ message: 'Username dan password wajib diisi' }, { status: 400 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ message: 'Username atau password salah' }, { status: 401 })
    }

    const token = signToken({ uid: user.id, uname: user.username })
    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, name: user.name, whatsapp: user.whatsapp },
    })
  } catch (err) {
    console.error('[POST /api/auth/login]', err.message)
    return NextResponse.json({ message: 'Terjadi kesalahan' }, { status: 500 })
  }
}
