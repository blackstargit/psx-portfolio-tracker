import { ImageResponse } from 'next/og'

export const alt = 'PSX Portfolio Tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: '#16a34a',
              letterSpacing: '-2px',
            }}
          >
            PSX
          </div>
          <div style={{ fontSize: 64, fontWeight: 700, color: '#fafafa' }}>
            Portfolio Tracker
          </div>
        </div>
        <div
          style={{
            marginTop: '28px',
            fontSize: 32,
            color: '#a3a3a3',
            maxWidth: '900px',
            lineHeight: 1.3,
          }}
        >
          Holdings, live prices, dividends, sector allocation &amp; monthly
          investment planning for the Pakistan Stock Exchange.
        </div>
        <div
          style={{
            marginTop: '48px',
            fontSize: 28,
            color: '#16a34a',
            fontWeight: 600,
          }}
        >
          psx.blackstar.io
        </div>
      </div>
    ),
    { ...size }
  )
}
