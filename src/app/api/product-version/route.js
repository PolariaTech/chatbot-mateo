import { NextResponse } from 'next/server';
import { MATEO_PRODUCT_VERSION } from '../../../lib/product-version-constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Versión del deploy actual (REQ-293). Sin caché para que una pestaña vieja
 * detecte el SemVer nuevo. El bundle viejo conserva su constante; este
 * handler sirve la del deploy que está en el aire.
 */
export async function GET() {
  return NextResponse.json(
    { version: MATEO_PRODUCT_VERSION },
    {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    },
  );
}
