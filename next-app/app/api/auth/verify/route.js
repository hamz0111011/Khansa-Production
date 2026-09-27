import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'

// Support both GET and POST for token verification
async function handleVerify(req) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload) return NextResponse.json({ valid: false }, { status: 401 })

    const { data: user } = await supabase
      .from('users')
      .select('id, username, name, whatsapp')
      .eq('id', payload.uid)
      .single()

    if (!user) return NextResponse.json({ valid: false }, { status: 401 })
    return NextResponse.json({ valid: true, user })
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}

export async function GET(req) { return handleVerify(req) }
export async function POST(req) { return handleVerify(req) }
