"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import {
  Boxes,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false,
      });

      if (!res || res.error || !res.ok) {
        if (res?.error === "CredentialsSignin") {
          setErrorMessage("Invalid email or password. Please verify your credentials and try again.");
        } else {
          setErrorMessage("Authentication failed. Please verify your account is active and try again.");
        }
        setIsLoading(false);
        return;
      }

      // Successful authentication
      setIsRedirecting(true);

      // Fetch active session to retrieve user's database role
      let userRole: string | undefined;

      try {
        const sessionRes = await fetch("/api/auth/session", {
          headers: { "Cache-Control": "no-cache" },
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          userRole = sessionData?.user?.role;
        }
      } catch {
        // Fallback to getSession
        const session = await getSession();
        userRole = (session?.user as { role?: string })?.role;
      }

      if (!userRole) {
        // Brief retry if session endpoint took a moment to register cookie
        await new Promise((resolve) => setTimeout(resolve, 250));
        const retrySession = await getSession();
        userRole = (retrySession?.user as { role?: string })?.role;
      }

      // Determine redirect destination strictly by database role
      let targetPath = "/employee";
      if (userRole === "ADMIN") {
        targetPath = "/admin";
      } else if (userRole === "MANAGER") {
        targetPath = "/manager";
      } else if (userRole === "EMPLOYEE") {
        targetPath = "/employee";
      }

      // Perform clean navigation to destination with authenticated session cookie
      window.location.assign(targetPath);
    } catch (err) {
      console.error("Sign in exception:", err);
      setErrorMessage("An unexpected network error occurred. Please check your connection and try again.");
      setIsLoading(false);
      setIsRedirecting(false);
    }
  };

  const isSubmitting = isLoading || isRedirecting;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center sm:text-left mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
            <Boxes className="size-6" />
          </div>
          <div>
            <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-emerald-600 dark:text-emerald-400">
              Enterprise CRM
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Stock Emphasis
            </h1>
          </div>
        </div>

        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Sign In to Your Account
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enter your authorized business credentials to access your inventory workspace.
        </p>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-sm animate-in fade-in duration-200"
        >
          <AlertCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p className="font-semibold text-rose-900 dark:text-rose-200">
              Authentication Error
            </p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Email Address
          </label>
          <div className="relative rounded-xl shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
              <Mail className="size-4.5" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@stockemphasis.com"
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Authorized personnel only
            </span>
          </div>
          <div className="relative rounded-xl shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-slate-500">
              <Lock className="size-4.5" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/90 pl-10 pr-11 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isSubmitting}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus-visible:text-emerald-500 transition-colors disabled:opacity-40"
            >
              {showPassword ? (
                <EyeOff className="size-4.5" />
              ) : (
                <Eye className="size-4.5" />
              )}
            </button>
          </div>
        </div>

        {/* Sign In Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isRedirecting ? (
              <>
                <CheckCircle2 className="size-4.5 text-emerald-400 animate-pulse" />
                <span>Redirecting to your workspace...</span>
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="size-4.5 animate-spin" />
                <span>Authenticating credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to CRM</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security & Access Notice */}
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              Role-Governed Access:
            </strong>{" "}
            This internal system automatically routes authenticated users to their assigned Admin, Manager, or Employee dashboard based on database credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
