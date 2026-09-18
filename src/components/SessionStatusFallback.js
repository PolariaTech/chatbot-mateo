import SsoStatusScreen from './SsoStatusScreen';

export function SessionLoadingFallback() {
  return (
    <SsoStatusScreen
      title="Cargando…"
      message="Preparando la sesión."
    />
  );
}

export function SessionRedirectFallback() {
  return (
    <SsoStatusScreen
      title="Redirigiendo al inicio de sesión…"
      message="Serás enviado al portal de Polaria WMS."
    />
  );
}
