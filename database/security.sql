-- KAZU AI: optional Supabase / PostgreSQL direct-client security policies.
-- Apply using a trusted database owner. Never put the owner password in the browser.
-- The Next.js server uses its private DATABASE_URL connection for all Drizzle queries.
-- Local development remains a trusted, non-public database. For a public Supabase
-- database, use a least-privileged server connection and the production setup in README.
BEGIN;
CREATE OR REPLACE FUNCTION public.kazu_role(_user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT r.role::text FROM public.user_roles r JOIN public.users u ON u.id=r.user_id WHERE r.user_id=_user_id AND u.status='active' ORDER BY r.granted_at LIMIT 1 $$;
CREATE OR REPLACE FUNCTION public.kazu_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.kazu_role(auth.uid()) IN ('admin','super_admin') $$;
CREATE OR REPLACE FUNCTION public.kazu_is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.kazu_role(auth.uid())='super_admin' $$;
CREATE OR REPLACE FUNCTION public.kazu_announcement_visible(record public.announcements) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT record.status='published' AND (record.publish_at IS NULL OR record.publish_at<=now()) AND (record.expires_at IS NULL OR record.expires_at>=now()) AND (record.audience='all' OR (record.audience='signed-in' AND auth.uid() IS NOT NULL) OR (record.audience='administrators' AND public.kazu_is_admin())) $$;
REVOKE ALL ON FUNCTION public.kazu_role(uuid), public.kazu_is_admin(), public.kazu_is_super_admin(), public.kazu_announcement_visible(public.announcements) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.kazu_role(uuid), public.kazu_is_admin(), public.kazu_is_super_admin(), public.kazu_announcement_visible(public.announcements) TO anon, authenticated;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visualizer_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated USING (id=auth.uid() OR public.kazu_is_admin());
-- No direct-client INSERT/UPDATE: account creation and role changes use the server.
CREATE POLICY roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.kazu_is_admin());
CREATE POLICY sessions_own ON public.user_sessions FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY releases_public ON public.app_releases FOR SELECT TO anon, authenticated USING (status='published' OR public.kazu_is_admin());
CREATE POLICY announcements_public ON public.announcements FOR SELECT TO anon, authenticated USING (public.kazu_announcement_visible(record) OR public.kazu_is_admin());
CREATE POLICY themes_public ON public.theme_configs FOR SELECT TO anon, authenticated USING (status='published' OR public.kazu_is_admin());
CREATE POLICY flags_public ON public.feature_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY presets_public ON public.visualizer_presets FOR SELECT TO anon, authenticated USING (status='published' OR owner_id=auth.uid() OR public.kazu_is_admin());
CREATE POLICY feedback_own ON public.feedback_reports FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.kazu_is_admin());
CREATE POLICY audit_read ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.kazu_is_admin());
-- There are intentionally no UPDATE or DELETE policies for audit history.
CREATE POLICY reads_own ON public.notification_reads FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY projects_own ON public.studio_projects FOR ALL TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY exports_own ON public.export_events FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
-- Direct clients may publish only their own presets, never assign roles or publish
-- application-wide content. Those operations belong exclusively to the trusted server.
CREATE POLICY preset_owner_insert ON public.visualizer_presets FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid() AND status='published');
CREATE POLICY preset_owner_update ON public.visualizer_presets FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
CREATE POLICY preset_owner_delete ON public.visualizer_presets FOR DELETE TO authenticated USING (owner_id=auth.uid());
-- Sync verified Supabase identities into the local role mirror. This trigger never
-- grants elevated privileges and never trusts user-supplied role values.
CREATE OR REPLACE FUNCTION public.kazu_sync_supabase_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.users(id,email,name,provider) VALUES(new.id,new.email,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),'supabase') ON CONFLICT(id) DO NOTHING; INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'user') ON CONFLICT DO NOTHING; RETURN new; END $$;
REVOKE ALL ON FUNCTION public.kazu_sync_supabase_user() FROM PUBLIC;
DROP TRIGGER IF EXISTS kazu_supabase_user_sync ON auth.users;
CREATE TRIGGER kazu_supabase_user_sync AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.kazu_sync_supabase_user();
REVOKE INSERT ON public.admin_audit_logs FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.admin_audit_logs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;
COMMIT;
-- For a hardened deployment, create a dedicated runtime login using a trusted
-- secret and set DATABASE_URL to that role. Never use the owner as runtime.
-- CREATE ROLE kazu_runtime LOGIN PASSWORD :'runtime_password';
-- GRANT USAGE ON SCHEMA public TO kazu_runtime;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kazu_runtime;
-- REVOKE UPDATE, DELETE ON public.admin_audit_logs FROM kazu_runtime;
-- REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM kazu_runtime;
-- Server-side role changes then require a separate SECURITY DEFINER function with
-- an explicit authorization check and a restricted EXECUTE grant. Do not grant
-- broad role-table write access to an untrusted or browser-facing connection.
-- The trusted CLI must temporarily use a privileged owner connection to provision.
