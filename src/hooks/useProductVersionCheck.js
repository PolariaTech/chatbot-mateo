'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchDeployProductVersion } from '../lib/fetch-deploy-product-version.js';
import { isProductVersionCheckEnabled } from '../lib/is-product-version-check-enabled.js';
import {
  MATEO_PRODUCT_VERSION,
  PRODUCT_VERSION_CHECK_INTERVAL_MS,
} from '../lib/product-version-constants.js';
import { useVisibleInterval } from './useVisibleInterval.js';

export function versionDeployEsNueva(versionLocal, versionDeploy) {
  if (!versionDeploy) return false;
  return versionDeploy !== versionLocal;
}

/**
 * Compara la versión del bundle con la del deploy. Solo en producción.
 */
export function useProductVersionCheck(enabled = true) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const checkEnabled = enabled && isProductVersionCheckEnabled();

  const checkVersion = useCallback(() => {
    if (!checkEnabled || updateAvailable) return;
    void leerVersionDelDeploy(setUpdateAvailable);
  }, [checkEnabled, updateAvailable]);

  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  useVisibleInterval(
    checkVersion,
    PRODUCT_VERSION_CHECK_INTERVAL_MS,
    checkEnabled && !updateAvailable,
  );

  return { updateAvailable };
}

async function leerVersionDelDeploy(marcarActualizacion) {
  const deployVersion = await fetchDeployProductVersion();
  if (versionDeployEsNueva(MATEO_PRODUCT_VERSION, deployVersion)) {
    marcarActualizacion(true);
  }
}
