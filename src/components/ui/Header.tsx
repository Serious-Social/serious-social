"use client";

import { useState } from "react";
import { APP_NAME } from "~/lib/constants";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";

type HeaderProps = {
  neynarUser?: {
    fid: number;
    score: number;
  } | null;
};

export function Header({ neynarUser }: HeaderProps) {
  const { context } = useMiniApp();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  return (
    <div className="relative">
      <div className="px-4 py-3 bg-theme-surface border-b border-theme-border flex items-center justify-between">
        <div className="text-lg font-semibold text-theme-text">{APP_NAME}</div>
        {context?.user && (
          <div
            className="cursor-pointer"
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
          >
            {context.user.pfpUrl && (
              <img
                src={context.user.pfpUrl}
                alt="Profile"
                className="w-9 h-9 rounded-full border-2 border-theme-primary"
              />
            )}
          </div>
        )}
      </div>
      {context?.user && isUserDropdownOpen && (
        <div className="absolute top-full right-0 z-50 w-fit mt-1 mx-4 bg-theme-surface rounded-lg shadow-lg border border-theme-border">
          <div className="p-3 space-y-2">
            <div className="text-right">
              <h3
                className="font-bold text-sm hover:underline cursor-pointer inline-block text-theme-text"
                onClick={() => sdk.actions.viewProfile({ fid: context.user.fid })}
              >
                {context.user.displayName || context.user.username}
              </h3>
              <p className="text-xs text-theme-text-muted">
                @{context.user.username}
              </p>
              <p className="text-xs text-theme-text-muted/70">
                FID: {context.user.fid}
              </p>
              {neynarUser && (
                <p className="text-xs text-theme-text-muted/70">
                  Neynar Score: {neynarUser.score}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
