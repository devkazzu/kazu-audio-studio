import Link from "next/link";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ArrowUpRight, AudioLines, ShieldCheck } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  await db.execute(sql`select 1`);
  return (
    <>
      <div className="home-welcome-note">
        <AudioLines size={19} />
        <span>Welcome to KAZU AI. Your sound has a whole new dimension.</span>
        <Link href="/audio-studio" className="text-button">
          Enter Audio Studio
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <section className="dashboard-hero">
        <img
          className="hero-art"
          src="/images/studio-hero.jpg"
          alt="KAZU violet sound universe"
        />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="hero-eyebrow">KAZU AI · CREATIVE WORKSPACE</span>
          <h2>
            A little sound.
            <br />
            Infinite possibilities.
          </h2>
          <p>
            Your music. Your imagination. Your signature visual.
            <br />
            Welcome to a new kind of creative space.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/audio-studio">
              Explore Audio Studio
              <ArrowUpRight size={16} />
            </Link>
            <Link className="hero-template-link" href="/audio-studio/templates">
              Find your inspiration
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="hero-note">
            <ShieldCheck size={12} />
            Local-first audio. Private by default.
          </div>
        </div>
      </section>
      <div className="studio-footer">
        <span>Crafted for creators. Powered by you.</span>
        <span>KAZU AI · AUDIO STUDIO</span>
      </div>
    </>
  );
}
