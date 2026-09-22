(function () {
  window.__mateoPwa = window.__mateoPwa || { deferredPrompt: null, installed: false };

  window.addEventListener(
    'beforeinstallprompt',
    function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.__mateoPwa.deferredPrompt = event;
      window.dispatchEvent(new Event('mateo-pwa-prompt'));
    },
    true
  );

  window.addEventListener('appinstalled', function () {
    window.__mateoPwa.deferredPrompt = null;
    window.__mateoPwa.installed = true;
    try {
      localStorage.setItem('mateo-pwa-installed', '1');
    } catch (error) {
      // ignore
    }
    window.dispatchEvent(new Event('mateo-pwa-installed'));
  });
})();
