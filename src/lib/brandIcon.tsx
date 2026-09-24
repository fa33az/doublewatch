import { ImageResponse } from 'next/og';

/** App icon (two screens + live dot) rendered at `size`px, for the PWA manifest and apple-touch-icon. */
export function brandIcon(size: number, { maskable = false } = {}) {
  const s = (v: number) => Math.round((v / 512) * size);
  // Maskable icons get cropped to a circle by Android; keep the artwork in the inner 80%
  const inset = maskable ? s(80) : s(56);

  const screen = {
    flex: 1,
    height: '100%',
    borderRadius: s(28),
    border: `${s(14)}px solid #37a2ea`,
    display: 'flex',
  } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f191e',
          borderRadius: maskable ? 0 : s(96),
          padding: inset,
        }}
      >
        <div style={{ display: 'flex', gap: s(28), width: '100%', height: s(230), position: 'relative' }}>
          <div style={screen} />
          <div style={{ ...screen, borderColor: '#ea76ae' }} />
          <div
            style={{
              position: 'absolute',
              top: -s(22),
              right: -s(22),
              width: s(64),
              height: s(64),
              borderRadius: s(32),
              background: '#ec4c4f',
              border: `${s(12)}px solid #0f191e`,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
