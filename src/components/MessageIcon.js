function iconPath(kind) {
  switch (kind) {
    case 'table':
      return (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18M9 5v14M15 5v14" />
        </>
      );
    case 'chart':
      return (
        <>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16V11" />
          <path d="M12 16V8" />
          <path d="M16 16v-5" />
        </>
      );
    case 'box':
      return (
        <>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </>
      );
    case 'money':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8" />
          <path d="M9.5 10.5c.6-.8 1.5-1.2 2.5-1.2 1.3 0 2.3.7 2.3 1.8 0 2.4-5 1.4-5 3.8 0 1.1 1.1 1.8 2.5 1.8 1.1 0 2-.5 2.5-1.3" />
        </>
      );
    case 'doc':
      return (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h6" />
        </>
      );
    default:
      return (
        <path d="M12 3l1.2 3.6L17 8l-3.8 1.4L12 13l-1.2-3.6L7 8l3.8-1.4L12 3z" />
      );
  }
}

export default function MessageIcon({ kind = 'sparkle', className = 'message-icon' }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconPath(kind)}
    </svg>
  );
}
