"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Users,
  FolderOpen,
  Download,
  SlidersHorizontal,
  Activity,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  MessageSquare,
  Check,
  Database,
  HardDrive,
  KeyRound,
  Megaphone,
  Palette,
  History,
  AudioLines,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { adminSections, adminRequest } from "./AdminManager";
export function AdminDashboard() {
  const { user, signIn } = useApp();
  const [data, setData] = useState<null | {
    users: number;
    projects: number;
    exports: number;
    presets: number;
    feedback: number;
    activeUsers: number;
    releases: { id: string; version: string; title: string; status: string }[];
    activity: {
      id: string;
      action: string;
      entity: string;
      createdAt: string;
    }[];
    flags: { key: string; enabled: boolean }[];
    system: { database: string; storage: string; auth: string };
  }>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (user?.role === "admin" || user?.role === "super_admin")
      void adminRequest("dashboard")
        .then(setData)
        .catch((e) => setError(e.message));
  }, [user]);
  const admin = user?.role === "admin" || user?.role === "super_admin";
  if (!admin)
    return (
      <div className="login-wall">
        <div>
          <span className="login-wall-icon">
            <ShieldCheck size={32} strokeWidth={1.5} />
          </span>
          <div className="eyebrow">KAZU CONTROL CENTER</div>
          <h1>
            {user
              ? "A little more access is needed."
              : "Behind every great experience."}
          </h1>
          <p>
            {user
              ? "Your account doesn’t have administrator permissions. Contact a Super Admin if you need access."
              : "Sign in with an authorized administrator account to manage the KAZU workspace."}
          </p>
          <button
            className="button primary"
            onClick={() => (user ? location.assign("/audio-studio") : signIn())}
          >
            {user ? "Back to your studio" : "Administrator sign in"}
            <ArrowUpRight size={16} />
          </button>
          <small>
            <ShieldCheck size={11} />
            Permissions are verified securely on the server.
          </small>
        </div>
      </div>
    );
  return (
    <>
      <div className="admin-heading">
        <div className="eyebrow">THE BIG PICTURE</div>
        <h1>Good things are happening.</h1>
        <p>Your workspace, at a glance. Real data. A little more control.</p>
      </div>
      <div className="admin-security-banner">
        <ShieldCheck size={22} />
        <div>
          <strong>Secure by design.</strong>
          <p>
            Role-based access. Server-verified permissions. An append-only audit
            trail.
          </p>
        </div>
        <span>{user?.role === "super_admin" ? "SUPER ADMIN" : "ADMIN"}</span>
      </div>
      {error && <div className="inline-warning">{error}</div>}
      {!data ? (
        <div className="editor-loading">Loading real workspace statistics…</div>
      ) : (
        <>
          <div className="admin-stats-grid">
            {[
              {
                label: "Registered users",
                value: data.users,
                icon: Users,
                note: `${data.activeUsers} new in the last 7 days`,
              },
              {
                label: "Studio configurations",
                value: data.projects,
                icon: FolderOpen,
                note: "Cloud configurations · audio stays local",
              },
              {
                label: "Published presets",
                value: data.presets,
                icon: AudioLines,
                note: "15 built-ins + published custom presets",
              },
              {
                label: "Recorded exports",
                value: data.exports,
                icon: Download,
                note: "Activity synced by signed-in creators",
              },
            ].map(({ label, value, icon: Icon, note }) => (
              <div className="admin-stat" key={label}>
                <span>
                  {label}
                  <Icon />
                </span>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="admin-columns">
            <section className="admin-card">
              <div className="admin-card-heading">
                <h2>Recent activity</h2>
                <Link href="/admin/audit-logs" className="text-button">
                  View audit log
                  <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="admin-card-body">
                {data.activity.length ? (
                  data.activity.map((a) => (
                    <div className="admin-activity-row" key={a.id}>
                      <span className="admin-activity-icon">
                        <Activity size={16} />
                      </span>
                      <div>
                        <strong>{a.action.replace(/[._]/g, " ")}</strong>
                        <p>Administrative action · {a.entity}</p>
                      </div>
                      <time>{new Date(a.createdAt).toLocaleDateString()}</time>
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    <Activity size={29} />
                    <h3>A clean slate.</h3>
                    <p>Admin changes will appear here as they happen.</p>
                  </div>
                )}
              </div>
            </section>
            <section className="admin-card">
              <div className="admin-card-heading">
                <h2>Application releases</h2>
                <Link href="/admin/updates" className="text-button">
                  Manage
                  <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="admin-card-body">
                {data.releases.length ? (
                  data.releases.map((r) => (
                    <div className="release-list-row" key={r.id}>
                      <span>
                        <Sparkles size={18} />
                      </span>
                      <div>
                        <strong>KAZU {r.version}</strong>
                        <p>{r.title}</p>
                      </div>
                      <small>{r.status}</small>
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    <Sparkles size={27} />
                    <h3>Ready for your first release.</h3>
                    <p>Published updates appear in everyone’s notifications.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
          <div className="section-heading" style={{ marginTop: 29 }}>
            <div>
              <h2>Your control center</h2>
              <p>Everything behind a great creative experience.</p>
            </div>
          </div>
          <div className="admin-section-grid">
            {adminSections.map(({ id, title, description, icon: Icon }) => (
              <Link
                href={`/admin/${id}`}
                className="admin-section-tile"
                key={id}
              >
                <span>
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <small>{description}</small>
                </div>
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
          <section className="admin-card" style={{ marginTop: 25 }}>
            <div className="admin-card-heading">
              <h2>System status</h2>
              <span className="status-pill published">
                <i className="live-dot" />
                OPERATIONAL
              </span>
            </div>
            <div className="admin-card-body">
              {[
                { label: "PostgreSQL database", value: data.system.database },
                { label: "Authentication", value: data.system.auth },
                { label: "Audio & video storage", value: data.system.storage },
                { label: "Authorization", value: "server-verified" },
                { label: "Audit history", value: "append-only" },
              ].map((item) => (
                <div className="system-status-row" key={item.label}>
                  <strong style={{ fontSize: 10, fontWeight: 450 }}>
                    {item.label}
                  </strong>
                  <span>
                    <i />
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <p className="track-analysis-note" style={{ marginTop: 17 }}>
            Local project and video files are private to each browser and are
            not included in cloud statistics. Export activity is counted only
            when a signed-in creator’s device successfully syncs it.
          </p>
        </>
      )}
    </>
  );
}
