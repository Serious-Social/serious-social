"use client";

import Link from "next/link";

/**
 * HomeTab component displays the main landing content for the mini app.
 *
 * This is the default tab that users see when they first open the mini app.
 * It provides access to belief market features.
 */
export function HomeTab() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)] px-6">
      <div className="text-center w-full max-w-md mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">Belief Markets</h2>
          <p className="text-sm text-gray-600">
            Signal conviction with capital. Support claims you believe in or
            challenge those you disagree with.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/create"
            className="block w-full py-4 px-6 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
          >
            Create a Belief Market
          </Link>

          <p className="text-xs text-gray-500">
            Create a market for your claim and share it with your followers
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            Powered by Neynar
          </p>
        </div>
      </div>
    </div>
  );
} 