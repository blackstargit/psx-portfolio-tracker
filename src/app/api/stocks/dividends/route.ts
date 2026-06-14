import { NextRequest, NextResponse } from 'next/server'
import { fetchDividends } from '@/lib/yahoo/dividends'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  const from = request.nextUrl.searchParams.get('from') ?? undefined

  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter is required' }, { status: 400 })
  }

  const dividends = await fetchDividends(symbol.toUpperCase(), from)
  return NextResponse.json({ dividends })
}
