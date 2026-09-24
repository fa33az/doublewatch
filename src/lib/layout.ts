import type { CSSProperties } from 'react';
import type { LayoutMode } from './settings';

export interface GridLayout {
  style: CSSProperties;
  areaOf: (slot: number) => string;
  atBottom: (slot: number) => boolean;   // touches the bottom edge (where the theater dock appears)
}

interface GridInput {
  n: number;
  mode: LayoutMode;
  bigSlot: number;     // spotlight: the slot shown large
  splitRatio: number;  // 2-screen grid: CH 1 share
  isMobile: boolean;
}

// minmax(0, …) stops iframes' intrinsic size from stretching tracks
const fr = (v: number) => `minmax(0, ${v}fr)`;
const repeatFr = (count: number) => Array(count).fill(fr(1)).join(' ');

/**
 * Grid placement for the screens. Panes stay in slot order in the DOM and only their
 * grid-area changes, so switching layouts never moves (and reloads) an iframe.
 */
export function computeGrid(input: GridInput): GridLayout {
  const { style, areaOf } = gridTemplate(input);
  // Areas named in the last row of the template sit on the bottom edge
  const rows = String(style.gridTemplateAreas).match(/"[^"]+"/g) ?? [];
  const lastRow = (rows[rows.length - 1] ?? '').replace(/"/g, '').split(/\s+/);
  return { style, areaOf, atBottom: slot => lastRow.includes(areaOf(slot)) };
}

function gridTemplate({ n, mode, bigSlot, splitRatio, isMobile }: GridInput): Omit<GridLayout, 'atBottom'> {
  const slots = Array.from({ length: n }, (_, i) => i);

  if (mode === 'spotlight') {
    const others = slots.filter(s => s !== bigSlot);
    const small = others.map((_, i) => `s${i}`);
    const areaOf = (slot: number) => (slot === bigSlot ? 'big' : `s${others.indexOf(slot)}`);

    const style: CSSProperties = isMobile
      ? { // big on top, thumbnails in a row below
          gridTemplateAreas: `"${others.map(() => 'big').join(' ')}" "${small.join(' ')}"`,
          gridTemplateColumns: repeatFr(others.length),
          gridTemplateRows: `${fr(3)} ${fr(1)}`,
        }
      : { // big on the left, thumbnails stacked on the right
          gridTemplateAreas: small.map(s => `"big ${s}"`).join(' '),
          gridTemplateColumns: `${fr(3)} ${fr(1)}`,
          gridTemplateRows: repeatFr(others.length),
        };
    return { style, areaOf };
  }

  const areaOf = (slot: number) => `p${slot}`;

  if (isMobile) {
    return {
      style: {
        gridTemplateAreas: slots.map(s => `"p${s}"`).join(' '),
        gridTemplateColumns: fr(1),
        gridTemplateRows: n === 2 ? `${fr(splitRatio)} ${fr(1 - splitRatio)}` : repeatFr(n),
      },
      areaOf,
    };
  }

  const templates: Record<number, CSSProperties> = {
    2: { gridTemplateAreas: '"p0 p1"', gridTemplateColumns: `${fr(splitRatio)} ${fr(1 - splitRatio)}`, gridTemplateRows: fr(1) },
    3: { gridTemplateAreas: '"p0 p1" "p2 p2"', gridTemplateColumns: repeatFr(2), gridTemplateRows: repeatFr(2) },
    4: { gridTemplateAreas: '"p0 p1" "p2 p3"', gridTemplateColumns: repeatFr(2), gridTemplateRows: repeatFr(2) },
  };
  return { style: templates[n], areaOf };
}
