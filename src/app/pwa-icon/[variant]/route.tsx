import { brandIcon } from '../../../lib/brandIcon';

const VARIANTS: Record<string, { size: number; maskable: boolean }> = {
  '192': { size: 192, maskable: false },
  '512': { size: 512, maskable: false },
  'maskable-512': { size: 512, maskable: true },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map(variant => ({ variant }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { size, maskable } = VARIANTS[(await params).variant];
  return brandIcon(size, { maskable });
}
