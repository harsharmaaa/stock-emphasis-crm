"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      className={
        className ??
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
      }
    >
      {isLoading ? (
        <>
          <Loader2 className="size-4 animate-spin text-slate-400" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          <LogOut className="size-4 text-slate-500 dark:text-slate-400" />
          <span>Sign Out</span>
        </>
      )}
    </button>
  );
}
