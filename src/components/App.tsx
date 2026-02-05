"use client";

import { useEffect } from "react";
import { useMiniApp } from "@neynar/react";
import sdk from "@farcaster/miniapp-sdk";
import { Header } from "~/components/ui/Header";
import { HomeTab } from "~/components/ui/tabs";
import { useNeynarUser } from "../hooks/useNeynarUser";

export default function App() {
  const { isSDKLoaded, context } = useMiniApp();
  const { user: neynarUser } = useNeynarUser(context || undefined);

  useEffect(() => {
    if (isSDKLoaded) {
      sdk.actions.ready();
    }
  }, [isSDKLoaded]);

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-theme-bg">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p className="text-theme-text-muted">Loading SDK...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-theme-bg min-h-screen"
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <Header neynarUser={neynarUser} />
      <div className="container py-2">
        <HomeTab fid={context?.user?.fid} />
      </div>
    </div>
  );
}
