-- Fix infinite recursion in user_roles policy
-- Drop the problematic policy that queries user_roles from within itself
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create new policy using the has_role security definer function
-- This bypasses RLS and prevents infinite recursion
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));