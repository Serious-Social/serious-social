import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { APP_NAME, APP_DESCRIPTION } from "~/lib/constants";

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
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
          backgroundColor: '#334155', // slate-700
          padding: '60px',
        }}
      >
        {/* App name */}
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          {APP_NAME}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '36px',
            color: '#e2e8f0', // slate-200
            textAlign: 'center',
            maxWidth: '900px',
            marginBottom: '48px',
          }}
        >
          {APP_DESCRIPTION}
        </p>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            backgroundColor: '#475569', // slate-600
            padding: '16px 32px',
            borderRadius: '16px',
          }}
        >
          <span style={{ fontSize: '28px', color: '#94a3b8' }}>
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