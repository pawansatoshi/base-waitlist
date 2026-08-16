"use client";

import { useEffect, useState } from "react";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "./providers/MiniAppProvider";
import { useRouter } from "next/navigation";
import { farcasterConfig } from "../farcaster.config";
import styles from "./page.module.css";

interface AuthResponse {
  success: boolean;
  user?: { fid: number; issuedAt?: number; expiresAt?: number };
  message?: string;
}

export default function Home() {
  const { context, isReady, isInMiniApp } = useMiniApp();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authData, setAuthData] = useState<AuthResponse | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const authenticate = async () => {
      if (!isInMiniApp) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await sdk.quickAuth.fetch("/api/auth");
        const data = (await response.json()) as AuthResponse;
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Authentication failed");
        }
        setAuthData(data);
      } catch (err) {
        setAuthError(err instanceof Error ? err : new Error("Authentication failed"));
      } finally {
        setIsAuthLoading(false);
      }
    };

    void authenticate();
  }, [isReady, isInMiniApp]);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleClose = () => {
    if (isInMiniApp) {
      void sdk.actions.close();
      return;
    }
    router.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isReady || isAuthLoading || isSubmitting) return;

    if (isInMiniApp && (authError || !authData?.success)) {
      setError("Please authenticate to join the waitlist");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fid: authData?.user?.fid ?? context?.user?.fid ?? null,
        }),
      });

      const data = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to join the waitlist");
      }

      router.push("/success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to join the waitlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.closeButton} type="button" onClick={handleClose} aria-label="Close">
        ✕
      </button>

      <div className={styles.content}>
        <div className={styles.waitlistForm}>
          <h1 className={styles.title}>Join {farcasterConfig.miniapp.name.toUpperCase()}</h1>
          <p className={styles.subtitle}>
            Hey {context?.user?.displayName || "there"}, Get early access and be the first to experience the future of<br />
            crypto marketing strategy.
          </p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <input
              type="email"
              placeholder="Your amazing email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.emailInput}
              autoComplete="email"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "waitlist-error" : undefined}
            />
            {error && <p id="waitlist-error" className={styles.error} role="alert">{error}</p>}
            <button type="submit" className={styles.joinButton} disabled={!isReady || isAuthLoading || isSubmitting}>
              {isSubmitting ? "JOINING..." : "JOIN WAITLIST"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
