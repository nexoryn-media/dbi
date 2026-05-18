"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "account_not_active") {
      setError("Your account is pending approval or has been deactivated.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tenant = searchParams.get("__tenant");
      
      let endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      if (tenant) endpoint += `?__tenant=${tenant}`;

      const body = isRegister
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      console.log(`[Client] Login response status: ${res.status}`);

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (isRegister && data.message) {
        setSuccess(data.message);
        setForm({ name: "", email: "", password: "" });
        setIsRegister(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Decorative background elements */}
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />

        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              {isRegister ? "Create Account" : "Welcome Back"}
            </h1>
            <p className={styles.subtitle}>
              {isRegister
                ? "Fill in your details to get started"
                : "Sign in to your account to continue"}
            </p>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.5V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="currentColor" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successBanner} style={{ 
              background: 'rgba(34, 197, 94, 0.1)', 
              color: '#22c55e', 
              padding: '12px', 
              borderRadius: '8px', 
              fontSize: '0.875rem',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '16px',
              border: '1px solid rgba(34, 197, 94, 0.2)'
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            {isRegister && (
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  className={styles.input}
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                required
                minLength={6}
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setSuccess("");
            }}
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
