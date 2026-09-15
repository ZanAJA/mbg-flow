"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "@/shared/components/ui/sonner";
import { AppShell } from "@/shared/components/app-shell";

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return new QueryClient({
      defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
    });
  }
  browserQueryClient ??= new QueryClient({
    defaultOptions: { queries: { staleTime: 5_000, retry: 1 } },
  });
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <AppShell>{children}</AppShell>
      <Toaster />
    </QueryClientProvider>
  );
}
