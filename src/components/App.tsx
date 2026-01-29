"use client";

import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { HomeTab } from "~/components/ui/tabs";
import { useNeynarUser } from "../hooks/useNeynarUser";

export default function App() {
  const { isSDKLoaded, context } = useMiniApp();
  const { user: neynarUser } = useNeynarUser(context || undefined);

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p>Loading SDK...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <Header neynarUser={neynarUser} />
      <div className="container py-2">
        <HomeTab />
      </div>
    </div>
  );
}

