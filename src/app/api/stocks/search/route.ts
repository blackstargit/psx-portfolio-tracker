import { NextRequest, NextResponse } from 'next/server'
import { searchPSXStocks } from '@/lib/psx/search'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchPSXStocks(q)
  return NextResponse.json({ results })
}
