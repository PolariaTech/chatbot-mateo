"use client";

import { useState } from "react";
import { FaWarehouse } from "react-icons/fa";
import { buildWmsReturnUrl } from "../lib/auth-config";
import { useAuth } from "../hooks/useAuth";

export default function WmsLinkButton({ compact = false }) {
  const { leaveForWms } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async (event) => {
    event.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    const result = await leaveForWms();
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error);
    }
  };

  const label = isLoading ? "Conectando…" : "Polaria WMS";

  return (
    <span className="wms-link-btn-wrap">
      <a
        href={buildWmsReturnUrl()}
        onClick={handleClick}
        className={`outline-btn${compact ? " outline-btn--compact" : ""}${isLoading ? " outline-btn--loading" : ""}`}
        aria-label="Ir a Polaria WMS"
        aria-busy={isLoading}
        aria-disabled={isLoading}
      >
        <FaWarehouse aria-hidden="true" />
        {!compact && <span>{label}</span>}
      </a>
      {error && (
        <span className="wms-link-btn__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
