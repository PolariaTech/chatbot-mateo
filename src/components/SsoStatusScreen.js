import '../styles/auth.css';

export default function SsoStatusScreen({
  title,
  message,
  children,
  className,
  logoSrc = '/logo.png',
  logoAlt = 'Polaria',
  logoClassName = 'sso-screen__logo',
  showFooter = true,
}) {
  const rootClass = className ? `sso-screen ${className}` : 'sso-screen';

  return (
    <div className={rootClass}>
      <div className="polaria-aurora sso-screen__aurora" aria-hidden />
      <div className="sso-screen__ring sso-screen__ring--outer" aria-hidden />
      <div className="sso-screen__ring sso-screen__ring--inner" aria-hidden />

      <header className="sso-screen__brand">
        <img
          src={logoSrc}
          alt={logoAlt}
          width={240}
          height={64}
          className={logoClassName}
        />
      </header>

      <main className="sso-screen__main">
        <div className="sso-status-card polaria-card-glow">
          <h1>{title}</h1>
          {message ? <p>{message}</p> : null}
          <div className="sso-status-card__slot">
            {children ?? <div className="sso-spinner" aria-hidden />}
          </div>
        </div>
      </main>

      {showFooter ? (
        <footer className="sso-screen__footer">
          Sistema seguro de autenticación empresarial
        </footer>
      ) : null}
    </div>
  );
}
