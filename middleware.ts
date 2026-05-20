import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'ucl_access'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/access' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (req.cookies.get(COOKIE)?.value !== 'granted') {
    const url = req.nextUrl.clone()
    url.pathname = '/access'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
