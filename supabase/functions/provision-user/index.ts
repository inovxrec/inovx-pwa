import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function generateTempPassword(): string {
  const words = ["orbit", "maple", "civic", "quartz", "delta", "harbor"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(10 + Math.random() * 89);

  return `${pick()}-${pick()}-${digits}`;
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();

    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401 }
      );
    }

    const { data: canProvision } = await callerClient.rpc("has_perm", {
      perm: "account.provision",
    });

    if (!canProvision) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403 }
      );
    }

    const { name, email, domain, role, position_title } = await req.json();

    if (!name || !email || !role) {
      return new Response(
        JSON.stringify({ error: "Missing name/email/role" }),
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400 }
      );
    }

    const { error: userRowError } = await supabaseAdmin
      .from("users")
      .insert({
        id: authUser.user.id,
        email,
        name,
        domain,
        role,
        position_title,
        status: "active",
        must_change_password: true,
      });

    if (userRowError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);

      return new Response(
        JSON.stringify({ error: userRowError.message }),
        { status: 400 }
      );
    }

    supabaseAdmin.functions
      .invoke("send-email", {
        body: {
          to: email,
          template: "welcome",
          tempPassword,
        },
      })
      .catch(() => {});

    return new Response(
      JSON.stringify({
        userId: authUser.user.id,
        tempPassword,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 }
    );
  }
});
