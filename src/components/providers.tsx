"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  DEFAULT_THEME,
  type Principal,
  type PublicContent,
  type ThemeConfig,
} from "@/lib/audio-studio/types";
import { getLocalPresets } from "@/lib/audio-studio/project-storage";
interface AppContextValue {
  user: Principal | null;
  setUser: (user: Principal | null) => void;
  content: PublicContent;
  flags: { key: string; enabled: boolean }[];
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  refreshContent: () => Promise<void>;
  toast: (message: string, kind?: "success" | "error" | "info") => void;
  signIn: () => void;
}
const AppContext = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Principal | null>(null);
  const [content, setContent] = useState<PublicContent>({
    theme: null,
    releases: [],
    announcements: [],
    presets: [],
  });
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT_THEME);
  const [flags, setFlags] = useState<{ key: string; enabled: boolean }[]>([]);
  const [toasts, setToasts] = useState<
    { id: number; message: string; kind: string }[]
  >([]);
  const [signInOpen, setSignInOpen] = useState(false);
  const toast = useCallback(
    (message: string, kind: "success" | "error" | "info" = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-3), { id, message, kind }]);
      window.setTimeout(
        () => setToasts((t) => t.filter((item) => item.id !== id)),
        5000,
      );
    },
    [],
  );
  const refreshLocalPresets = useCallback(async () => {
    try {
      const local = await getLocalPresets();
      setContent((current) => ({
        ...current,
        presets: [
          ...current.presets.filter((p) => !local.some((l) => l.id === p.id)),
          ...local.map((p) => ({ ...p, custom: true })),
        ],
      }));
    } catch (error) {
      console.warn("Local preset library unavailable", error);
    }
  }, []);
  const setTheme = useCallback((next: ThemeConfig) => {
    setThemeState(next);
    const root = document.documentElement;
    const map: Record<string, string> = {
      "--bg": next.background,
      "--surface": next.surface,
      "--primary": next.primary,
      "--secondary": next.secondary,
      "--text": next.text,
      "--border": next.border,
      "--radius": `${next.radius}px`,
      "--glow": String(next.glow),
      "--font": next.font,
      "--sidebar": `color-mix(in srgb, ${next.background} 82%, ${next.surface} 18%)`,
      "--muted": `color-mix(in srgb, ${next.text} 48%, transparent)`,
    };
    root.dataset.animations = String(next.animations);
    for (const [key, value] of Object.entries(map))
      root.style.setProperty(key, value);
  }, []);
  const refreshContent = useCallback(async () => {
    try {
      const [authResponse, contentResponse] = await Promise.all([
        fetch("/api/auth"),
        fetch("/api/content"),
      ]);
      const auth = await authResponse.json();
      const next = await contentResponse.json();
      if (!contentResponse.ok) throw new Error(next.error);
      if (authResponse.ok) setUser(auth.user);
      setContent(next);
      if (next.flags) setFlags(next.flags);
      if (next.theme) setTheme({ ...DEFAULT_THEME, ...next.theme });
    } catch (error) {
      console.warn("Published content unavailable", error);
    }
  }, [setTheme]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshContent();
      void refreshLocalPresets();
    }, 0);
    const listener = (event: StorageEvent) => {
      if (event.key === "kazu_logged_in") void refreshContent();
    };
    window.addEventListener("storage", listener);
    window.addEventListener("kazu-presets-changed", refreshLocalPresets);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", listener);
      window.removeEventListener("kazu-presets-changed", refreshLocalPresets);
    };
  }, [refreshContent, refreshLocalPresets]);
  useEffect(() => {
    if (!signInOpen) return;
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSignInOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [signInOpen]);
  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        content,
        theme,
        setTheme,
        refreshContent,
        toast,
        flags,
        signIn: () => setSignInOpen(true),
      }}
    >
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className={`toast ${t.kind}`} key={t.id}>
            {t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "i"}
            <span>{t.message}</span>
            <button
              onClick={() =>
                setToasts((items) => items.filter((i) => i.id !== t.id))
              }
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
    </AppContext.Provider>
  );
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
import { Modal } from "@/components/ui";
function SignInModal({ onClose }: { onClose: () => void }) {
  const { setUser, toast, refreshContent } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: form.get("email"),
          password: form.get("password"),
          name: form.get("name"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.confirmationRequired) {
        toast(
          "Check your email to confirm your account, then sign in.",
          "info",
        );
        setMode("login");
      } else {
        setUser(data.user);
        await refreshContent();
        toast(`Welcome${mode === "signup" ? " to KAZU" : " back"}!`);
        onClose();
        window.dispatchEvent(
          new StorageEvent("storage", { key: "kazu_logged_in" }),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        mode === "login" ? "Welcome back" : "Your creative journey starts here"
      }
      subtitle="Sign in to your KAZU account. Your local audio always stays private."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        {mode === "signup" && (
          <label>
            Your name
            <input
              name="name"
              required
              maxLength={80}
              autoComplete="name"
              placeholder="What should we call you?"
            />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 10 : 1}
            maxLength={128}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            placeholder={
              mode === "signup" ? "At least 10 characters" : "Your password"
            }
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full-width" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </button>
        <p className="muted center small">
          New accounts have User permissions.{" "}
          {mode === "login" ? (
            <button
              type="button"
              className="text-button"
              onClick={() => setMode("signup")}
            >
              Create an account
            </button>
          ) : (
            <button
              type="button"
              className="text-button"
              onClick={() => setMode("login")}
            >
              Sign in instead
            </button>
          )}
        </p>
      </form>
    </Modal>
  );
}
