import { Suspense } from "react";
import { StudioEditor } from "@/components/audio-studio/StudioEditor";
export const metadata = { title: "Studio Editor" };
export default async function EditorPage({ searchParams }: { searchParams: Promise<{ project?: string; preset?: string }> }) {
  const query = await searchParams;
  return <Suspense fallback={<div className="editor-loading">Opening your creative workspace…</div>}><StudioEditor key={`${query.project || "new"}:${query.preset || "default"}`} initialProjectId={query.project} initialPresetId={query.preset} /></Suspense>;
}
