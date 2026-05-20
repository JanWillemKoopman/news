import { NextRequest, NextResponse } from 'next/server'

const CODE = process.env.ACCESS_CODE ?? 'Fire1@1'

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (typeof code !== 'string' || code !== CODE) {
      return NextResponse.json({ error: 'Verkeerde toegangscode' }, { status: 401 })
    }
    const res = NextResponse.json({ ok: true })
    res.cookies.set('ucl_access', 'granted', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  }
}
