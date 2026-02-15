"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

type ReactQueryProviderProps = {
  children: React.ReactNode;
};

export default function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [client] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes - data won't refetch until stale
          gcTime: 10 * 60 * 1000, // 10 minutes - keep unused queries in cache
          retry: 1, // Retry failed requests once
          refetchOnWindowFocus: false, // Don't refetch when window regains focus
          refetchOnMount: false, // Don't refetch on mount if data exists
          refetchOnReconnect: false, // Don't refetch when reconnecting
        },
      },
    })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

