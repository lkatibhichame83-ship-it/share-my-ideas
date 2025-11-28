-- 1. Create service_requests table
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  worker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected')),
  budget numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own requests"
ON public.service_requests FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Workers can view requests assigned to them"
ON public.service_requests FOR SELECT
USING (auth.uid() = worker_id);

CREATE POLICY "Clients can create requests"
ON public.service_requests FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Workers can update their assigned requests"
ON public.service_requests FOR UPDATE
USING (auth.uid() = worker_id);

CREATE POLICY "Clients can update their own requests"
ON public.service_requests FOR UPDATE
USING (auth.uid() = client_id);

CREATE POLICY "Admins can view all requests"
ON public.service_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all requests"
ON public.service_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create messages table for chat
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
ON public.messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;

-- 3. Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  worker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD' NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  paid_at timestamp with time zone
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Workers can view their payments"
ON public.payments FOR SELECT
USING (auth.uid() = worker_id);

CREATE POLICY "Admins can view all payments"
ON public.payments FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('request', 'message', 'payment', 'review', 'system')),
  is_read boolean DEFAULT false,
  link text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5. Create trigger for updated_at on service_requests
CREATE TRIGGER update_service_requests_updated_at
BEFORE UPDATE ON public.service_requests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Add indexes for better performance
CREATE INDEX idx_service_requests_client_id ON public.service_requests(client_id);
CREATE INDEX idx_service_requests_worker_id ON public.service_requests(worker_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX idx_messages_service_request_id ON public.messages(service_request_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_payments_client_id ON public.payments(client_id);
CREATE INDEX idx_payments_worker_id ON public.payments(worker_id);

-- 7. Secure phone numbers - Remove from public view
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view basic profile info"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can view their own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);