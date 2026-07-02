export default function PolariaIcon({ size = 24, className = '' }) {
  return (
    <img
      src="/Icon.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      className={`polaria-icon ${className}`.trim()}
    />
  );
}
