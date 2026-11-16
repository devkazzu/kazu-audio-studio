import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminSections } from "@/components/admin/AdminManager";
export const metadata = { title: "Admin Control Center" };
export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!adminSections.some((s) => s.id === section)) notFound();
  return <AdminShell section={section} />;
}
