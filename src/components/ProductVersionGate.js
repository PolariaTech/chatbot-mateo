"use client";

import { createElement, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useProductVersionCheck } from "../hooks/useProductVersionCheck";
import { reloadWithCacheClear } from "../lib/reload-with-cache-clear";
import ProductVersionDialog from "./ProductVersionDialog";

export default function ProductVersionGate() {
  const { updateAvailable } = useProductVersionCheck();
  const [accepting, setAccepting] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!updateAvailable || typeof document === "undefined") return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowAnterior;
    };
  }, [updateAvailable]);

  if (!updateAvailable || typeof document === "undefined") return null;

  return createPortal(
    createElement(ProductVersionDialog, {
      titleId,
      descriptionId,
      accepting,
      onAccept: aceptarNuevaVersion(accepting, setAccepting),
    }),
    document.body,
  );
}

function aceptarNuevaVersion(accepting, setAccepting) {
  return () => {
    if (accepting) return;
    setAccepting(true);
    reloadWithCacheClear().catch(() => {
      setAccepting(false);
    });
  };
}
