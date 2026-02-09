export default function Logo({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Rounded background */}
      <rect width="64" height="64" rx="14" fill="currentColor" className="text-white/20" />

      {/* Clipboard body */}
      <rect x="14" y="12" width="36" height="44" rx="4" fill="white" />

      {/* Clipboard clip */}
      <rect x="22" y="8" width="20" height="8" rx="3" fill="rgba(0,0,0,0.3)" />

      {/* House roof */}
      <polygon points="32,22 18,34 46,34" fill="var(--brand-secondary, #fbbf24)" />

      {/* House body */}
      <rect x="22" y="34" width="20" height="14" fill="var(--brand-secondary, #fbbf24)" />

      {/* Door */}
      <rect x="29" y="37" width="6" height="11" rx="1" fill="var(--brand-primary, #b91c1c)" />

      {/* Green checkmark badge */}
      <circle cx="42" cy="48" r="8" fill="#16a34a" />
      <polyline
        points="37,48 40,51 47,44"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
