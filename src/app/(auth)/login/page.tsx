"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import logoCmw from "~/public/logo-cmw.png";
import { Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (searchParams.get("expired") === "1") {
      setInfo("Your session has expired. Please sign in again.");
    } else if (err === "not_registered") {
      setError(
        "This Google account is not registered. Please contact your administrator.",
      );
    } else if (err === "unauthorized_department" || err === "forbidden") {
      setError(
        "Access denied. Only Project Leader and Project Leader Coordinator can access this system.",
      );
    } else if (err === "OAuthAccountNotLinked") {
      setError(
        "This email is registered with a password. Please sign in with email & password.",
      );
    } else if (err) {
      setError("Sign in failed. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "unauthorized_department") {
        setError(
          "Access denied. Only Project Leader and Project Leader Coordinator can access this system.",
        );
      } else {
        setError("Incorrect email or password");
      }
    } else {
      router.push("/dashboard");
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Sign In</h2>

      {info && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {info}
        </div>
      )}

      {/* ✅ ERROR MESSAGE YANG LEBIH MENONJOL */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Access Denied
              </p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Google Login */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mb-5"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">
          or sign in with email
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPw ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-center text-xs text-gray-400 mt-5">
        Don&apos;t have an account? Contact your administrator.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#1e2635] to-[#2d3a4f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-xl px-4 py-2 shadow-lg">
              <Image
                src={logoCmw}
                alt="CMW Logo"
                width={140}
                height={56}
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">
            CMW Project Management
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Internal Project Management System
          </p>
        </div>
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center text-gray-400 text-sm">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}