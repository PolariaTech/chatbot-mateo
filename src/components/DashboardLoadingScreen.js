import SsoStatusScreen from './SsoStatusScreen';

export default function DashboardLoadingScreen({
  title = 'Cargando el dashboard',
  message = 'Estamos abriendo el reporte.',
  className = 'sso-screen--fill',
}) {
  return (
    <SsoStatusScreen
      className={className}
      title={title}
      message={message}
      logoSrc="/mateo-ia-logo.png"
      logoAlt="Mateo IA"
      logoClassName="sso-screen__logo sso-screen__logo--mateo"
      showFooter={false}
    />
  );
}
