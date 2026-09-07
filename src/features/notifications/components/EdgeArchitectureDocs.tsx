import { Panel } from '../../../components/Panel';

export function EdgeArchitectureDocs() {
  return (
    <div className="arch-docs-container">
      <div className="arch-header">
        <h3 className="section-title">PART F: ARCHITECTURE & BACKEND CONTRACTS</h3>
        <p className="section-subtitle">
          Implementation blueprints for server-side fan-out, Web Push dispatch, and Email pipelines
        </p>
      </div>

      <div className="arch-grid">
        <Panel className="arch-card" bracket>
          <div className="arch-card-title">1. NOTIFICATION FAN-OUT & DEDUPLICATION</div>
          <p className="arch-card-text">
            <strong>Client-Side:</strong> Evaluates <code>deduplication_key</code> or{' '}
            <code>idempotency_key</code> within a 15-minute sliding window before inserting into{' '}
            <code>notifications</code> to prevent rapid duplicate alerts.
          </p>
          <p className="arch-card-text">
            <strong>Server-Side Fan-Out:</strong> When a task is created or modified that impacts
            multiple operators, RLS restricts regular users from inserting rows into other users&apos;{' '}
            <code>notifications</code> table. An Edge Function running with Supabase{' '}
            <code>SERVICE_ROLE_KEY</code> (or a PostgreSQL trigger on <code>tasks</code>) handles
            fan-out securely:
          </p>
          <pre className="arch-code-block">
{`-- Example DB Trigger Fan-Out
CREATE OR REPLACE FUNCTION handle_task_fanout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id <> NEW.assignee_id) THEN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (
      NEW.assignee_id,
      'Directive Assigned: ' || NEW.title,
      'Assigned to your station in domain ' || NEW.domain,
      'task_assigned',
      jsonb_build_object('task_id', NEW.id, 'idempotency_key', 'assign:' || NEW.id || ':' || NEW.assignee_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
          </pre>
        </Panel>

        <Panel className="arch-card" bracket>
          <div className="arch-card-title">2. WEB PUSH DISPATCH ARCHITECTURE</div>
          <p className="arch-card-text">
            <strong>Frontend:</strong> Service worker registered at <code>/sw.js</code>. Subscriptions
            stored in <code>push_subscriptions</code> via <code>VITE_VAPID_PUBLIC_KEY</code>.
          </p>
          <p className="arch-card-text">
            <strong>Edge Function Dispatch:</strong> The <code>VAPID_PRIVATE_KEY</code> must NEVER be
            exposed on the frontend. A Supabase Edge Function (<code>send-web-push</code>) triggers
            using <code>web-push</code>:
          </p>
          <pre className="arch-code-block">
{`// Supabase Edge Function: send-web-push/index.ts
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:ops@inovx.club',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')! // Secure Edge Secret
);

Deno.serve(async (req) => {
  const { subscription, title, body, url } = await req.json();
  await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }));
  return new Response(JSON.stringify({ success: true }));
});`}
          </pre>
        </Panel>

        <Panel className="arch-card" bracket>
          <div className="arch-card-title">3. EMAIL DISPATCH PIPELINE</div>
          <p className="arch-card-text">
            <strong>Security Boundary:</strong> SMTP and Resend/SendGrid API keys are never stored
            in the client bundle.
          </p>
          <p className="arch-card-text">
            <strong>Database Webhook / Edge Function:</strong> When a high-priority alert or
            broadcast is logged in <code>notifications</code>, a Supabase Database Webhook fires
            the <code>dispatch-email</code> Edge Function:
          </p>
          <pre className="arch-code-block">
{`// Edge Function: dispatch-email/index.ts
import { Resend } from 'npm:resend@3.2.0';
const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

Deno.serve(async (req) => {
  const { recipient_email, subject, html } = await req.json();
  const data = await resend.emails.send({
    from: 'INOVX84 Ops <alerts@inovx.club>',
    to: [recipient_email],
    subject,
    html,
  });
  return new Response(JSON.stringify(data));
});`}
          </pre>
        </Panel>

        <Panel className="arch-card" bracket>
          <div className="arch-card-title">4. SQL MIGRATION SPECIFICATION (PART B COMPATIBILITY)</div>
          <p className="arch-card-text">
            Canonical schema tables with RLS policies ensuring users can read their own alerts and
            preferences:
          </p>
          <pre className="arch-code-block">
{`-- 1. Canonical Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_type, channel)
);

-- 4. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sender TEXT,
  created_by UUID REFERENCES public.users(id),
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.notification_prefs
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone views active announcements" ON public.announcements
  FOR SELECT USING (true);`}
          </pre>
        </Panel>
      </div>
    </div>
  );
}
