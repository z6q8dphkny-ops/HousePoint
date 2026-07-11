
-- Drop policies that depend on has_role
DROP POLICY IF EXISTS "Admins can insert app state" ON public.app_state;
DROP POLICY IF EXISTS "Admins can update app state" ON public.app_state;
DROP POLICY IF EXISTS "Admins can delete history" ON public.history_entries;
DROP POLICY IF EXISTS "Admins can insert history" ON public.history_entries;

-- Now safe to drop the function
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Recreate policies using inline EXISTS against user_roles.
-- user_roles RLS allows a user to SELECT their own rows, which is exactly
-- what these checks need.
CREATE POLICY "Admins can insert app state"
  ON public.app_state FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can update app state"
  ON public.app_state FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can insert history"
  ON public.history_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ));

CREATE POLICY "Admins can delete history"
  ON public.history_entries FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::public.app_role
  ));
