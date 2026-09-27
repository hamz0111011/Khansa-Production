import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { hashPassword } from '@/lib/auth'

export async function POST(req) {
  try {
    const { username, password, name, whatsapp } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ message: 'Username dan password wajib diisi' }, { status: 400 })
    }
    if (username.trim().length < 3) {
      return NextResponse.json({ message: 'Username minimal 3 karakter' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Password minimal 6 karakter' }, { status: 400 })
    }

    const { error } = await supabase.from('users').insert({
      username: username.trim(),
      password_hash: hashPassword(password),
      name: name || username.trim(),
      whatsapp: whatsapp || null,
    })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Username sudah digunakan' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil dibuat! Silakan login.' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/auth/register]', err.message)
    return NextResponse.json({ message: 'Gagal membuat akun' }, { status: 500 })
  }
}
