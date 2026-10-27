export default function PotholeSymbol({ size = 44 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 3 45 40a3 3 0 0 1-2.6 4.5H5.6A3 3 0 0 1 3 40L24 3Z" fill="#ffdc65" stroke="#773b16" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="m12 32 6-3 4 2 5-4 7 3 3 5-7 4-11-1-7-6Z" fill="#49372e" />
    <path d="m12 32 8 1 7-2 10 4M24 14v7" stroke="#fff9dc" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="24" cy="25" r="1.5" fill="#773b16" />
  </svg>;
}
