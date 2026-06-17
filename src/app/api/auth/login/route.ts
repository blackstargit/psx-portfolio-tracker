import { NextResponse } from 'next/server'
import { createHmac } from 'crypto'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    const validUser = username === process.env.USERNAME
    const validPass = password === process.env.PASSWORD

    if (!validUser || !validPass) {
      await new Promise((r) => setTimeout(r, 300))
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const secret = process.env.SESSION_SECRET!
    const token = createHmac('sha256', secret).update('authenticated').digest('hex')

    const res = NextResponse.json({ ok: true })
    res.cookies.set('psx_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
