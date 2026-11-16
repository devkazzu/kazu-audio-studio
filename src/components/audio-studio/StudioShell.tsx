"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  AudioLines,
  LayoutGrid,
  FolderOpen,
  Layers3,
  LayoutTemplate,
  SlidersHorizontal,
  Download,
  Search,
  Bell,
  Sun,
  ChevronDown,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowRight,
  CircleHelp,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Check,
  Command,
  Home,
  MoreHorizontal,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { Button, KazuMark, Modal } from "@/components/ui";
import { formatTime } from "@/lib/audio-studio/types";
const navigation = [
  { label: "Home", href: "/", icon: LayoutGrid },
  { label: "Audio Studio", href: "/audio-studio", icon: AudioLines },
  { label: "My Projects", href: "/audio-studio/projects", icon: FolderOpen },
  { label: "Visualizers", href: "/audio-studio/visualizers", icon: Layers3 },
  { label: "Templates", href: "/audio-studio/templates", icon: LayoutTemplate },
  { label: "Presets", href: "/audio-studio/presets", icon: SlidersHorizontal },
];
export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser, content, flags, refreshContent, toast, signIn } =
    useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const admin = user?.role === "admin" || user?.role === "super_admin";
  const studio = pathname.startsWith("/audio-studio");
  const adminPage = pathname.startsWith("/admin");
  const notifications = [
    ...content.releases.map((r) => ({
      id: `release:${r.id}`,
      title: r.title,
      body: `KAZU ${String(r.version)} is available`,
      type: "release",
    })),
    ...content.announcements.map((r) => ({
      id: `announcement:${r.id}`,
      title: r.title,
      body: String(r.body),
      type: "announcement",
    })),
  ];
  const unread = notifications.filter((n) => !readIds.includes(n.id)).length;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMobileOpen(false);
      setNotificationsOpen(false);
      setProfileOpen(false);
      setSearchOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    const timer = window.setTimeout(() => setReadIds(content.readIds || []), 0);
    return () => clearTimeout(timer);
  }, [content.readIds]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchRef.current?.focus(), 30);
  }, [searchOpen]);
  const active = (href: string) =>
    href === "/audio-studio"
      ? pathname === href || pathname.startsWith("/audio-studio/editor")
      : pathname.startsWith(href);
  async function markRead(id?: string) {
    if (!user) {
      signIn();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : { action: "read-all" }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      await refreshContent();
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : "Could not update notifications.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      setUser(null);
      await refreshContent();
      router.push("/audio-studio");
      toast("Signed out. Your local projects are still here.", "info");
    } catch {
      toast("Could not sign out. Please try again.", "error");
    }
  }
  const results = [
    ...navigation.filter((n) => n.href !== "/"),
    {
      label: "Export History",
      href: "/audio-studio/export-history",
      icon: Download,
    },
    ...(admin
      ? [{ label: "Admin Control Center", href: "/admin", icon: ShieldCheck }]
      : []),
  ].filter((n) => n.label.toLowerCase().includes(query.toLowerCase()));
  const presetResults = query.trim()
    ? content.presets
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : [];
  return (
    <div className="studio-shell">
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        ></button>
      )}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="brand" aria-label="KAZU AI home">
            <span className="brand-mark">
              <KazuMark size={33} />
            </span>
            <span>
              KAZU<span className="brand-ai">AI</span>
            </span>
          </Link>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active(href) ? "active" : ""}`}
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
              {label === "Audio Studio" && (
                <small className="new-badge">NEW</small>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label tools-label">YOUR LIBRARY</div>
        <nav className="main-nav">
          <Link
            href="/audio-studio/export-history"
            className={`nav-item ${pathname.includes("export-history") ? "active" : ""}`}
          >
            <Download size={19} strokeWidth={1.7} />
            <span>Export History</span>
          </Link>
          <button className="nav-item" onClick={() => setFeedbackOpen(true)}>
            <MessageSquare size={19} strokeWidth={1.7} />
            <span>Feedback & Support</span>
          </button>
          {admin && (
            <Link
              href="/admin"
              className={`nav-item ${adminPage ? "active" : ""}`}
            >
              <ShieldCheck size={19} strokeWidth={1.7} />
              <span>Admin Center</span>
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="studio-promo">
            <div className="mini-equalizer">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <span className="promo-spark">
              <Sparkles size={17} />
            </span>
            <h3>Made for your sound.</h3>
            <p>
              Your next great visual
              <br />
              starts with an idea.
            </p>
            <button onClick={() => router.push("/audio-studio/editor")}>
              Open Studio
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="help-link" onClick={() => setHelpOpen(true)}>
            <CircleHelp size={17} />
            Help & shortcuts
            <ArrowUpRight size={14} />
          </button>
          <button
            className="sidebar-profile"
            onClick={() => (admin ? router.push("/admin") : signIn())}
          >
            <span className="avatar">
              {user ? user.name.slice(0, 1).toUpperCase() : "K"}
            </span>
            <span>
              <strong>{user?.name || "KAZU Creator"}</strong>
              <small>
                {admin
                  ? "Administrator"
                  : user
                    ? "Personal workspace"
                    : "Your creative workspace"}
              </small>
            </span>
            {admin ? <ShieldCheck size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {adminPage
                ? "Admin Control Center"
                : studio
                  ? pathname === "/audio-studio"
                    ? "Audio Studio"
                    : pathname
                        .split("/")
                        .pop()
                        ?.split("-")
                        .map((w) => w[0]?.toUpperCase() + w.slice(1))
                        .join(" ")
                  : "Overview"}
            </strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Search anything...</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <div className="popover-anchor">
              <button
                className={`icon-button notification-button ${notificationsOpen ? "selected" : ""}`}
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileOpen(false);
                }}
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              >
                <Bell size={19} strokeWidth={1.6} />
                {unread > 0 && <span className="notification-dot" />}
              </button>
              {notificationsOpen && (
                <div className="notifications-popover">
                  <div className="popover-title">
                    <strong>Notifications</strong>
                    <button
                      className="text-button"
                      onClick={() => void markRead()}
                      disabled={busy}
                    >
                      Mark all read
                    </button>
                  </div>
                  {notifications.length ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        className={`notification-item ${!readIds.includes(n.id) ? "unread" : ""}`}
                        onClick={() => void markRead(n.id)}
                      >
                        <span className="notification-icon">
                          {n.type === "release" ? (
                            <Sparkles size={18} />
                          ) : (
                            <Bell size={18} />
                          )}
                        </span>
                        <span>
                          <strong>{n.title}</strong>
                          <small>{n.body}</small>
                        </span>
                        {!readIds.includes(n.id) && <i />}
                      </button>
                    ))
                  ) : (
                    <div className="notification-empty">
                      <Bell size={27} strokeWidth={1.3} />
                      <h3>You’re all caught up</h3>
                      <p>
                        Published updates and announcements
                        <br />
                        will appear here.
                      </p>
                    </div>
                  )}
                  <div className="popover-foot">
                    Real updates from the KAZU team.
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/audio-studio/presets"
              className="icon-button theme-button"
              aria-label="Explore themes and presets"
            >
              <Sun size={19} strokeWidth={1.6} />
            </Link>
            <div className="popover-anchor">
              <button
                className="avatar top-avatar"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                aria-label="Account menu"
              >
                {user ? user.name.slice(0, 1).toUpperCase() : "K"}
              </button>
              {profileOpen && (
                <div className="profile-popover">
                  <strong>{user?.name || "Welcome to KAZU"}</strong>
                  <small>{user?.email || "Create without an account"}</small>
                  {user ? (
                    <>
                      <button
                        onClick={() => {
                          router.push("/audio-studio/projects");
                          setProfileOpen(false);
                        }}
                      >
                        <FolderOpen size={16} />
                        My projects
                      </button>
                      {admin && (
                        <button onClick={() => router.push("/admin")}>
                          <ShieldCheck size={16} />
                          Admin Control Center
                        </button>
                      )}
                      <button onClick={() => void logout()}>
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          signIn();
                          setProfileOpen(false);
                        }}
                      >
                        <LogOut size={16} />
                        Sign in / Create account
                      </button>
                      <p>Local projects don’t need an account.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className={`main-content ${studio ? "studio-content" : ""}`}>
          {children}
        </main>
        <nav className="mobile-bottom-nav">
          {navigation
            .filter((n) =>
              [
                "/",
                "/audio-studio",
                "/audio-studio/projects",
                "/audio-studio/presets",
              ].includes(n.href),
            )
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={active(href) ? "active" : ""}
              >
                <Icon size={20} />
                <span>
                  {label === "My Projects"
                    ? "Projects"
                    : label === "Audio Studio"
                      ? "Studio"
                      : label}
                </span>
              </Link>
            ))}
          <button onClick={() => setMobileOpen(true)}>
            <MoreHorizontal size={21} />
            <span>More</span>
          </button>
        </nav>
      </div>
      {searchOpen && (
        <Modal
          title="Find your next idea"
          subtitle="Jump to a studio tool or explore a preset."
          onClose={() => setSearchOpen(false)}
        >
          <div className="search-box">
            <Search size={18} />
            <input
              ref={searchRef}
              placeholder="Search tools and presets..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="search-results">
            {results.map(({ href, label, icon: Icon }) => (
              <button
                key={href}
                onClick={() => {
                  router.push(href);
                  setSearchOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
                <ArrowRight size={15} />
              </button>
            ))}
            {presetResults.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  router.push(
                    `/audio-studio/editor?preset=${encodeURIComponent(p.id)}`,
                  );
                  setSearchOpen(false);
                }}
              >
                <Sparkles size={18} />
                <span>
                  {p.name}
                  <small>Preset · {p.category}</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
            {!results.length && !presetResults.length && (
              <p className="muted">
                No matches. Try “visualizers” or “galaxy”.
              </p>
            )}
          </div>
          <div className="search-footer">
            <kbd>esc</kbd> to close
            <span>
              <Command size={12} /> K to search anywhere
            </span>
          </div>
        </Modal>
      )}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
      {helpOpen && (
        <Modal
          title="A little help, a lot of possibility"
          subtitle="Everything you need to find your flow."
          onClose={() => setHelpOpen(false)}
        >
          <div className="help-grid">
            <div>
              <h3>Start with a sound</h3>
              <p>
                Import an audio file or use your microphone. Audio is processed
                on your device and never uploaded automatically.
              </p>
            </div>
            <div>
              <h3>Make it your own</h3>
              <p>
                Choose a visualizer, customize layers, and add your artist name.
                Changes are saved locally as you work.
              </p>
            </div>
            <div>
              <h3>Create a video</h3>
              <p>
                Export your canvas and audio with MediaRecorder. Keep this tab
                visible while recording.
              </p>
            </div>
            <div>
              <h3>Find your flow</h3>
              <p>
                <kbd>⌘ / Ctrl K</kbd> Search · <kbd>⌘ / Ctrl S</kbd> Save
                project · <kbd>⌘ / Ctrl Z</kbd> Undo
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setHelpOpen(false);
              router.push("/audio-studio/editor");
            }}
          >
            Open Studio
            <ArrowRight size={16} />
          </Button>
        </Modal>
      )}
    </div>
  );
}
export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { user } = useApp();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.get("category"),
          message: form.get("message"),
          email: form.get("email"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send feedback.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={sent ? "Thanks for helping us grow" : "Let’s make KAZU better"}
      subtitle={
        sent
          ? "Your report has been securely saved for the KAZU team."
          : "A bug, a big idea, or a little feedback. We’re listening."
      }
      onClose={onClose}
    >
      {sent ? (
        <div className="feedback-success">
          <Check size={36} />
          <p>Every great product starts with a conversation.</p>
          <Button onClick={onClose}>Back to creating</Button>
        </div>
      ) : (
        <form className="form-stack" onSubmit={submit}>
          <label>
            What’s on your mind?
            <select name="category">
              <option value="general">General feedback</option>
              <option value="audio">Audio playback</option>
              <option value="visualizer">Visualizer problem</option>
              <option value="export">Video export</option>
              <option value="performance">Performance issue</option>
              <option value="feature">Feature request</option>
              <option value="bug">Bug report</option>
            </select>
          </label>
          <label>
            Tell us more
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              placeholder="What happened? What would you love to see?"
            />
          </label>
          {!user && (
            <label>
              Email (optional)
              <input name="email" type="email" placeholder="you@example.com" />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button variant="primary" loading={busy} type="submit">
            Send feedback
            <ArrowRight size={16} />
          </Button>
          <p className="muted small">
            Please don’t include passwords or sensitive personal information.
          </p>
        </form>
      )}
    </Modal>
  );
}
