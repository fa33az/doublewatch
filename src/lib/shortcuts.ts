// Single source for the shortcut list shown in Settings → Shortcut and the "?" overlay.
// The handlers themselves live in page.tsx.

export interface ShortcutGroup {
  title: string;
  items: { keys: string[]; desc: string }[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Audio',
    items: [
      { keys: ['1', '←'], desc: '2 layar: audio penuh ke CH 1' },
      { keys: ['2', '→'], desc: '2 layar: audio penuh ke CH 2' },
      { keys: ['0', '3', '↑', '↓'], desc: '2 layar: mix kedua channel' },
      { keys: ['1', '2', '3', '4'], desc: '3–4 layar: dengarkan channel itu saja' },
      { keys: ['0'], desc: '3–4 layar: MIX semua channel' },
      { keys: ['M'], desc: 'Mute / unmute master' },
    ],
  },
  {
    title: 'Tontonan',
    items: [
      { keys: ['Spasi'], desc: 'Jeda / putar semua layar' },
      { keys: ['C'], desc: 'Nyalakan / matikan chat semua live' },
      { keys: ['F'], desc: 'Mode Teater (layar penuh)' },
    ],
  },
  {
    title: 'Navigasi',
    items: [
      { keys: ['S', '/'], desc: 'Cari live' },
      { keys: ['L'], desc: 'Buka Library' },
      { keys: ['?'], desc: 'Tampilkan daftar shortcut' },
      { keys: ['Esc'], desc: 'Tutup panel' },
    ],
  },
];
