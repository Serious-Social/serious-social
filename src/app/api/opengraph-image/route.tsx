import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { APP_NAME, APP_DESCRIPTION, APP_URL } from "~/lib/constants";

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const logoUrl = `${APP_URL}/logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f172a',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <img
          src={logoUrl}
          width={160}
          height={112}
          style={{ objectFit: 'contain' }}
        />

        {/* App name */}
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginTop: '32px',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          {APP_NAME}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '32px',
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '900px',
            marginBottom: '40px',
          }}
        >
          {APP_DESCRIPTION}
        </p>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#1e293b',
            padding: '14px 32px',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}
        >
          <span style={{ fontSize: '24px', color: '#64748b' }}>
            Signal conviction with capital
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
