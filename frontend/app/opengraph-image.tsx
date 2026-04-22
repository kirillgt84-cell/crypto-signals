import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Mirkaso — Precision in Investment Management'
export const size = { width: 1200, height: 630 }

export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.15) 0%, transparent 50%)',
          }}
        />
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: 24,
            letterSpacing: '-2px',
            display: 'flex',
          }}
        >
          Mirkaso
        </div>
        <div
          style={{
            fontSize: 36,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          Precision in Investment Management
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#64748b',
          }}
        >
          mirkaso.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
