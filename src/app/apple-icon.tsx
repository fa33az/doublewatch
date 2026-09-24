import { brandIcon } from '../lib/brandIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  // iOS rounds the corners itself, so render it full-bleed like a maskable icon
  return brandIcon(180, { maskable: true });
}
