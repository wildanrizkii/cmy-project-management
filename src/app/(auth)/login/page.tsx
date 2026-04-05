"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Loader2, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      setInfo("Sesi Anda telah berakhir. Silakan login kembali.");
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
      setError("Email atau password salah");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Masuk ke Sistem</h2>

      {info && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          {info}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@perusahaan.com"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
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
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm mt-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>

      {/* Demo accounts */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Akun Demo (password: password123)
        </p>
        <div className="space-y-1.5">
          {[
            { label: "Atasan (Manager)", email: "budi@perusahaan.com" },
            { label: "PIC — Project Leader", email: "rina@perusahaan.com" },
            { label: "PIC — Engineer Product", email: "agus@perusahaan.com" },
          ].map(({ label, email: demoEmail }) => (
            <button
              key={demoEmail}
              type="button"
              onClick={() => { setEmail(demoEmail); setPassword("password123"); }}
              className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-xs text-gray-600 transition-colors"
            >
              <span className="font-medium">{label}</span>
              <span className="ml-2 text-gray-400">{demoEmail}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#1e2635] to-[#2d3a4f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CMW Project Management</h1>
          <p className="text-gray-400 text-sm mt-1">Sistem Manajemen Proyek Internal</p>
        </div>
        <Suspense fallback={<div className="bg-white rounded-2xl shadow-2xl p-8 text-center text-gray-400 text-sm">Memuat...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
