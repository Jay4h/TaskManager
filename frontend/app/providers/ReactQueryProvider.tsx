"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

type ReactQueryProviderProps = {
  children: React.ReactNode;
};

export default function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [client] = useState(() => new QueryClient());

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
