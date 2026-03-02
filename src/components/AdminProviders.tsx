"use client";

import { ToastProvider, useToast } from "@/components/ToastContext";
import { ToastContainer } from "@/components/Modal";
import { ReactNode } from "react";

function ToastWrapper({ children }: { children: ReactNode }) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ToastWrapper>{children}</ToastWrapper>
    </ToastProvider>
  );
}
