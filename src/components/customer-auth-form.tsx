"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  loginCustomer,
  registerCustomer,
} from "@/app/account/actions";

export default function CustomerAuthForm({
  mode,
}: {
  mode: "login" | "register";
}) {
  const registering = mode === "register";

  const [state, formAction, pending] = useActionState(
    registering ? registerCustomer : loginCustomer,
    { error: "" },
  );

  return (
    <main className="customer-auth-screen">
      <section className="customer-auth-card">
        <Link href="/" aria-label="BIMLAY home">
          <Image
            src="/branding/bimlay-logo.png"
            alt="BIMLAY"
            width={100}
            height={100}
            className="customer-auth-logo"
            unoptimized
          />
        </Link>

        <p className="eyebrow">Your BIMLAY</p>

        <h1>
          {registering ? "Make yourself at home." : "Welcome back."}
        </h1>

        <p className="customer-auth-description">
          {registering
            ? "Create an account for your next everyday discovery."
            : "Sign in to view your account and orders."}
        </p>

        <form action={formAction} className="customer-auth-form">
          <fieldset disabled={pending}>
            {registering && (
              <label>
                <span>Full name</span>
                <input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>
            )}

            <label>
              <span>Email address</span>
              <input
                name="email"
                type="email"
                autoComplete="username"
                maxLength={254}
                required
              />
            </label>

            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete={
                  registering ? "new-password" : "current-password"
                }
                minLength={registering ? 12 : undefined}
                maxLength={128}
                required
              />
            </label>

            {registering && (
              <>
                <p className="category-help">
                  Use at least 12 characters.
                </p>

                <label>
                  <span>Confirm password</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={128}
                    required
                  />
                </label>
              </>
            )}

            <div aria-live="polite" aria-atomic="true">
              {state.error && (
                <p className="admin-form-error">{state.error}</p>
              )}
            </div>

            <button type="submit" className="primary-button">
              {pending
                ? "Please wait..."
                : registering
                  ? "Create account"
                  : "Sign in"}
            </button>
          </fieldset>
        </form>

        <p className="customer-auth-switch">
          {registering ? "Already have an account? " : "New to BIMLAY? "}
          <Link
            href={registering ? "/account/login" : "/account/register"}
          >
            {registering ? "Sign in" : "Create an account"}
          </Link>
        </p>

        <Link href="/" className="text-link">
          Back to store
        </Link>
      </section>
    </main>
  );
}