import { NextRequest, NextResponse } from 'next/server'
import { fetchPayouts } from '@/lib/psx/payouts'

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get('symbol')
  if (!symbol) {
    return NextResponse.json({ error: 'symbol parameter is required' }, { status: 400 })
  }
  const dividends = await fetchPayouts(symbol.toUpperCase())
  return NextResponse.json({ dividends })
}
