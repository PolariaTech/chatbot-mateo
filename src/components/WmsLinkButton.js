"use client";

import { useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { buildWmsReturnUrl } from "../lib/auth-config";
import { useAuth } from "../hooks/useAuth";

function SnowflakeIcon() {
  return (
    <svg
      className="polaria-topbar-btn__mateo-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m10 20-1.25-2.5L6 18" />
      <path d="M10 4 8.75 6.5 6 6" />
      <path d="m14 20 1.25-2.5L18 18" />
      <path d="m14 4 1.25 2.5L18 6" />
      <path d="m17 21-3-6h-4" />
      <path d="m6.75 8 3 6" />
      <path d="m2 12h6.5L10 9" />
      <path d="m22 12h-6.5L14 15" />
      <path d="m4 10-1.5-3" />
      <path d="m20 14 1.5 3" />
      <path d="m12 2v6.5" />
      <path d="m12 15.5V22" />
    </svg>
  );
}

export default function WmsLinkButton() {
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
        className={`polaria-topbar-btn polaria-topbar-btn--mateo polaria-topbar-btn--label-lg${isLoading ? " is-loading" : ""}`}
        aria-label="Ir a Polaria WMS"
        aria-busy={isLoading}
        aria-disabled={isLoading}
        title={error || "Ir a Polaria WMS"}
      >
        {isLoading ? (
          <FaSpinner className="polaria-topbar-btn__mateo-icon polaria-spin" aria-hidden="true" />
        ) : (
          <SnowflakeIcon />
        )}
        <span className="polaria-topbar-btn__label">{label}</span>
      </a>
      {error ? (
        <span className="wms-link-btn__error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
