"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  LockKeyhole,
  Check,
  Activity,
} from "lucide-react";
import { useApp } from "@/components/providers";
import { AdminDashboard } from "./AdminDashboard";
import { AdminManager } from "./AdminManager";
export function AdminShell({ section = "dashboard" }: { section?: string }) {
  const pathname = usePathname();
  const { user } = useApp();
  const active = pathname === "/admin" ? "dashboard" : section;
  return (
    <div className="admin-shell">
      <div className="admin-breadcrumb">
        <Link href="/audio-studio" className="text-button">
          <ArrowLeft size={12} />
          Back to studio
        </Link>
        <span>
          <ShieldCheck size={12} />
          KAZU CONTROL CENTER
        </span>
      </div>
      {active === "dashboard" ? (
        <AdminDashboard />
      ) : (
        <div className="login-wall" style={{ minHeight: "60vh" }}>
          <div>
            <span className="login-wall-icon">
              <LockKeyhole size={30} />
            </span>
            <div className="eyebrow">PROTECTED WORKSPACE</div>
            <h1>
              {user && ["admin", "super_admin"].includes(user.role)
                ? "Loading your control center…"
                : "Administrator access required."}
            </h1>
            <p>Permissions are verified on every server request.</p>
            <Link href="/admin" className="button primary">
              Control center
              <ShieldCheck size={15} />
            </Link>
          </div>
        </div>
      )}
      {user &&
        ["admin", "super_admin"].includes(user.role) &&
        active !== "dashboard" && <AdminManager section={active} />}
    </div>
  );
}
