/*
# VAANI — Auto-Profile Trigger

Creates a trigger that automatically inserts a profile row when a new user signs up via Supabase Auth.
This ensures every authenticated user has a corresponding profile entry.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if a user is a member of an organization
CREATE OR REPLACE FUNCTION public.is_org_member(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid()
    AND organization_id = check_org_id
  );
$$;

-- Function to get the user's role in an organization
CREATE OR REPLACE FUNCTION public.get_user_role(check_org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.memberships
  WHERE user_id = auth.uid()
  AND organization_id = check_org_id
  LIMIT 1;
$$;
