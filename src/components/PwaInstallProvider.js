"use client";

import { createContext, useContext } from "react";
import { usePwaInstallState } from "../hooks/usePwaInstall";

const PwaInstallContext = createContext(null);

export function PwaInstallProvider({ children }) {
  const value = usePwaInstallState();
  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return context;
}
