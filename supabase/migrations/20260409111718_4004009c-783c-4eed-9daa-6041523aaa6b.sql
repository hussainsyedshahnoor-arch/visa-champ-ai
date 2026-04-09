
-- Fix notifications insert policy - restrict to admins only (system inserts via service role)
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix officer_availability - remove duplicate permissive ALL, use specific policies
DROP POLICY "Admins manage availability" ON public.officer_availability;
CREATE POLICY "Admins can insert availability" ON public.officer_availability FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update availability" ON public.officer_availability FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete availability" ON public.officer_availability FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
