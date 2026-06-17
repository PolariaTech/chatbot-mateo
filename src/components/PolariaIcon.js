export default function PolariaIcon({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`polaria-icon ${className}`.trim()}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path
        d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.05 5.05l2.83 2.83M16.12 16.12l2.83 2.83M5.05 18.95l2.83-2.83M16.12 7.88l2.83-2.83"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7.5 4.5l1.5 3.5-3.5 1.5M16.5 4.5l-1.5 3.5 3.5 1.5M7.5 19.5l1.5-3.5-3.5-1.5M16.5 19.5l-1.5-3.5 3.5-1.5M4.5 7.5l3.5 1.5 1.5 3.5M19.5 7.5l-3.5 1.5-1.5 3.5M4.5 16.5l3.5-1.5 1.5-3.5M19.5 16.5l-3.5-1.5-1.5-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
