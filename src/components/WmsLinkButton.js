"use client";

import { FaWarehouse } from "react-icons/fa";
import { buildWmsReturnUrl, redirectToWmsWithSession } from "../lib/auth-config";

export default function WmsLinkButton({ compact = false }) {
  const handleClick = (event) => {
    event.preventDefault();
    redirectToWmsWithSession();
  };

  return (
    <a
      href={buildWmsReturnUrl()}
      onClick={handleClick}
      className={`wms-link-btn${compact ? " wms-link-btn--compact" : ""}`}
      aria-label="Ir a Polaria WMS"
    >
      <FaWarehouse aria-hidden="true" />
      {!compact && <span>Polaria WMS</span>}
    </a>
  );
}
