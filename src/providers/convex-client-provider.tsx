"use client";

import React, { useMemo, useRef, useEffect } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

function UserSync({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.storeUser);
  const syncedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading && !syncedRef.current) {
      syncedRef.current = true;
      storeUser().catch((err) => {
        syncedRef.current = false;
        console.error("Failed to sync authenticated user with Convex:", err);
      });
    } else if (!isAuthenticated) {
      syncedRef.current = false;
    }
  }, [isAuthenticated, isLoading, storeUser]);

  return <>{children}</>;
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud";
    return new ConvexReactClient(url);
  }, []);

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#244B3C",
          colorBackground: "#F7F5EF",
          borderRadius: "1rem",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserSync>{children}</UserSync>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
