-- Migration MANUAL: não aplicada neste gate. Aplicar apenas após implantação dos boundaries V2.
DROP POLICY IF EXISTS customer_appointments_public_insert
ON public.customer_appointments;
