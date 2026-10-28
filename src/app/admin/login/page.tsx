"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { loginAdmin } from "../actions";
import Image from "next/image";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, {
    error: "",
  });

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <Link
          href="/"
          className="admin-login-brand"
          aria-label="BIMLAY homepage"
        >
          <Image
            src="/branding/bimlay-logo.png"
            alt="BIMLAY"
            width={130}
            height={130}
            unoptimized
          />
        </Link>

        <div className="admin-login-icon">
          <LockKeyhole size={22} strokeWidth={1.5} />
        </div>

        <p className="eyebrow">Private workspace</p>
        <h1>Welcome back.</h1>
        <p className="admin-subtitle">Sign in to manage your BIMLAY store.</p>

        <form action={formAction} className="admin-login-form">
          <div>
            <label htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Your admin email"
              maxLength={254}
              required
              disabled={pending}
            />
          </div>

          <div>
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              maxLength={128}
              required
              disabled={pending}
            />
          </div>

          <div aria-live="polite" aria-atomic="true">
            {state.error && <p className="admin-form-error">{state.error}</p>}
          </div>

          <button
            type="submit"
            className="primary-button admin-submit"
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
            <ArrowRight size={16} />
          </button>
        </form>

        <Link href="/" className="admin-back-link">
          <ArrowLeft size={14} />
          Back to store
        </Link>
      </section>
    </main>
  );
}
