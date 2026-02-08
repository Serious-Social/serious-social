import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { APP_NAME, APP_DESCRIPTION } from "~/lib/constants";

export const dynamic = 'force-dynamic';

const THEME = {
  bg: '#0c0a15',
  embedBg: '#110e1c',
  surface: '#1a1625',
  border: '#2d2640',
  primary: '#a78bfa',
  text: '#f5f3ff',
  textMuted: '#a1a1aa',
};

export async function GET(_request: NextRequest) {
  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: THEME.embedBg,
        padding: '48px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
      }}>
        {/* Grid texture overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${THEME.border}40 1px, transparent 1px),
            linear-gradient(90deg, ${THEME.border}40 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }} />

        {/* Content container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Header */}
          <span style={{
            color: THEME.primary,
            fontSize: '28px',
            fontWeight: 700,
            letterSpacing: '3px',
          }}>
            SERIOUS.SOCIAL
          </span>

          {/* Center content */}
          <div style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <h1 style={{
              fontSize: '80px',
              fontWeight: 700,
              color: THEME.text,
              margin: 0,
              textAlign: 'center',
            }}>
              {APP_NAME}
            </h1>
            <p style={{
              fontSize: '36px',
              color: THEME.textMuted,
              textAlign: 'center',
              margin: 0,
              marginTop: '20px',
            }}>
              {APP_DESCRIPTION}
            </p>
          </div>

          {/* Bottom tagline */}
          <div style={{
            display: 'flex',
            paddingTop: '32px',
            borderTop: `2px solid ${THEME.border}`,
          }}>
            <span style={{
              color: THEME.textMuted,
              fontSize: '24px',
              letterSpacing: '1px',
            }}>
              Signal conviction with capital and time
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}
