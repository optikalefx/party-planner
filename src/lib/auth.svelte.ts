/**
 * Convex Auth token management for SvelteKit (no React required).
 * Mirrors the token storage behaviour of @convex-dev/auth/react.
 */
import { browser } from "$app/environment";
import { ConvexHttpClient } from "convex/browser";

const VERIFIER_KEY = "__convexAuthOAuthVerifier";
const JWT_KEY = "__convexAuthJWT";
const REFRESH_KEY = "__convexAuthRefreshToken";

// Namespace keys by Convex URL so multiple deployments don't collide
function ns(convexUrl: string, key: string): string {
  return convexUrl.replace(/[^a-zA-Z0-9]/g, "") + key;
}

class AuthState {
  token = $state<string | null>(null);
  isLoading = $state(true);
}

export const auth = new AuthState();

let _convexUrl = "";

/**
 * Call once from +layout.svelte onMount.
 * Handles the OAuth callback code in the URL, loads any stored token,
 * then wires the token into the Convex client via setAuth.
 */
export async function initAuth(convexUrl: string, convexClient: { setAuth: Function }) {
  _convexUrl = convexUrl;

  if (!browser) {
    auth.isLoading = false;
    return;
  }

  // 1. Exchange OAuth code if present in URL
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  console.log("[auth] initAuth — code in URL:", !!code);
  if (code) {
    url.searchParams.delete("code");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    await _exchangeCode(code);
  } else {
    // 2. Restore stored token
    const stored = localStorage.getItem(ns(convexUrl, JWT_KEY));
    console.log("[auth] stored token present:", !!stored);
    if (stored) auth.token = stored;
  }

  console.log("[auth] after init — token:", auth.token ? "present" : "null");
  auth.isLoading = false;

  // 3. Wire token into Convex client
  convexClient.setAuth(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      console.log("[auth] fetchToken called — forceRefresh:", forceRefreshToken, "token:", auth.token ? "present" : "null");
      if (forceRefreshToken) {
        return await _refreshToken();
      }
      return auth.token;
    },
    (isAuthenticated: boolean) => {
      console.log("[auth] onChange — isAuthenticated:", isAuthenticated, "current token:", auth.token ? "present" : "null");
      if (!isAuthenticated) {
        auth.token = null;
      }
    }
  );
}

/** Redirect the browser to Google via Convex Auth */
export async function signInWithGoogle() {
  const verifier = localStorage.getItem(ns(_convexUrl, VERIFIER_KEY));
  if (verifier) localStorage.removeItem(ns(_convexUrl, VERIFIER_KEY));

  const httpClient = new ConvexHttpClient(_convexUrl);
  const result = await (httpClient as any).action("auth:signIn", {
    provider: "google",
    params: {},
    verifier: verifier ?? undefined,
  });

  if (result?.redirect) {
    localStorage.setItem(ns(_convexUrl, VERIFIER_KEY), result.verifier);
    window.location.href = result.redirect;
  }
}

/** Sign out: clear tokens locally and invalidate session on Convex */
export async function signOut(convexClient: { action: Function }) {
  try {
    await convexClient.action("auth:signOut" as any);
  } catch {
    // Already signed out or network issue — fine to ignore
  }
  auth.token = null;
  if (browser) {
    localStorage.removeItem(ns(_convexUrl, JWT_KEY));
    localStorage.removeItem(ns(_convexUrl, REFRESH_KEY));
    localStorage.removeItem(ns(_convexUrl, VERIFIER_KEY));
  }
}

async function _exchangeCode(code: string) {
  const verifier = localStorage.getItem(ns(_convexUrl, VERIFIER_KEY));
  if (verifier) localStorage.removeItem(ns(_convexUrl, VERIFIER_KEY));

  try {
    const httpClient = new ConvexHttpClient(_convexUrl);
    const result = await (httpClient as any).action("auth:signIn", {
      provider: undefined,
      params: { code },
      verifier: verifier ?? undefined,
    });
    if (result?.tokens) {
      auth.token = result.tokens.token;
      localStorage.setItem(ns(_convexUrl, JWT_KEY), result.tokens.token);
      localStorage.setItem(ns(_convexUrl, REFRESH_KEY), result.tokens.refreshToken);
    }
  } catch (e) {
    console.error("[auth] Failed to exchange OAuth code:", e);
  }
}

async function _refreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(ns(_convexUrl, REFRESH_KEY));
  console.log("[auth] _refreshToken — refreshToken present:", !!refreshToken);
  if (!refreshToken) return null;
  try {
    const httpClient = new ConvexHttpClient(_convexUrl);
    const result = await (httpClient as any).action("auth:signIn", { refreshToken });
    console.log("[auth] _refreshToken result:", result);
    if (result?.tokens) {
      auth.token = result.tokens.token;
      localStorage.setItem(ns(_convexUrl, JWT_KEY), result.tokens.token);
      localStorage.setItem(ns(_convexUrl, REFRESH_KEY), result.tokens.refreshToken);
      return result.tokens.token;
    }
  } catch (e) {
    console.error("[auth] _refreshToken failed:", e);
  }
  return null;
}
