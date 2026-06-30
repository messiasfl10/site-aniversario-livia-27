import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MINUTES = 15;
const MAX_INVITE_CODE_LENGTH = 64;

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const rateLimitPepper = Deno.env.get("INVITE_RATE_LIMIT_PEPPER");
const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (!supabaseUrl || !serviceRoleKey || !rateLimitPepper) {
  throw new Error("Missing required Edge Function environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

type JsonBody = {
  inviteCode?: unknown;
};

function getCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigin = allowedOrigins.has(origin) ? origin : "";

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(request),
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    return {
      code: record.code,
      details: record.details,
      hint: record.hint,
      message: record.message,
      name: record.name,
      status: record.status,
    };
  }

  return {
    message: String(error),
  };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function normalizeInviteCode(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim().toUpperCase();

  return normalized.length <= MAX_INVITE_CODE_LENGTH ? normalized : "";
}

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getNetworkHash(request: Request) {
  return sha256(`${rateLimitPepper}:${getClientAddress(request)}`);
}

async function isRateLimited(userId: string, networkHash: string) {
  const since = new Date(
    Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();

  const [userAttempts, networkAttempts] = await Promise.all([
    supabaseAdmin
      .from("invite_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("success", false)
      .gte("attempted_at", since),
    supabaseAdmin
      .from("invite_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("network_hash", networkHash)
      .eq("success", false)
      .gte("attempted_at", since),
  ]);

  if (userAttempts.error || networkAttempts.error) {
    console.error(
      "claim-invite rate-limit check unavailable:",
      JSON.stringify({
        networkError: networkAttempts.error
          ? serializeError(networkAttempts.error)
          : null,
        userError: userAttempts.error
          ? serializeError(userAttempts.error)
          : null,
      }),
    );

    return false;
  }

  return (
    Number(userAttempts.count || 0) >= MAX_ATTEMPTS ||
    Number(networkAttempts.count || 0) >= MAX_ATTEMPTS
  );
}

async function registerAttempt(
  userId: string,
  networkHash: string,
  success: boolean,
) {
  const { error } = await supabaseAdmin.from("invite_login_attempts").insert({
    user_id: userId,
    network_hash: networkHash,
    success,
  });

  if (error) {
    console.error("Unable to register invite login attempt:", error.message);
  }
}

async function getGuestByCode(inviteCode: string) {
  return supabaseAdmin
    .from("guests")
    .select(
      "id, name, max_guests, confirmed, active, invite_type, couple_members",
    )
    .eq("invite_code", inviteCode)
    .eq("active", true)
    .maybeSingle();
}

async function getExistingAccess(userId: string) {
  const { data: accessSession, error: sessionError } = await supabaseAdmin
    .from("guest_access_sessions")
    .select("guest_id, revoked_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionError) {
    throw sessionError;
  }

  if (!accessSession) {
    return { guest: null, revoked: false };
  }

  if (accessSession.revoked_at) {
    return { guest: null, revoked: true };
  }

  const { data: guest, error: guestError } = await supabaseAdmin
    .from("guests")
    .select(
      "id, name, invite_code, max_guests, confirmed, active, invite_type, couple_members",
    )
    .eq("id", accessSession.guest_id)
    .eq("active", true)
    .maybeSingle();

  if (guestError) {
    throw guestError;
  }

  if (!guest) {
    return { guest: null, revoked: true };
  }

  return { guest, revoked: false };
}

async function linkGuestSession(userId: string, guestId: string) {
  const now = new Date().toISOString();
  const { error: sessionError } = await supabaseAdmin
    .from("guest_access_sessions")
    .upsert(
      {
        user_id: userId,
        guest_id: guestId,
        last_access: now,
        revoked_at: null,
      },
      { onConflict: "user_id" },
    );

  if (sessionError) {
    throw sessionError;
  }

  const { error: accessError } = await supabaseAdmin.rpc(
    "register_guest_access",
    {
      target_guest_id: guestId,
    },
  );

  if (accessError) {
    throw accessError;
  }
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  let stage = "request";

  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin") || "";

    if (origin && !allowedOrigins.has(origin)) {
      return jsonResponse(request, { error: "Origin not allowed." }, 403);
    }

    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  const origin = request.headers.get("origin") || "";

  if (origin && !allowedOrigins.has(origin)) {
    return jsonResponse(request, { error: "Origin not allowed." }, 403);
  }

  try {
    stage = "authenticate";
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return jsonResponse(request, { error: "Unauthorized." }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user || user.is_anonymous !== true) {
      return jsonResponse(request, { error: "Unauthorized." }, 401);
    }

    stage = "parse-request";
    const body = (await request.json()) as JsonBody;
    const inviteCode = normalizeInviteCode(body.inviteCode);
    const networkHash = await getNetworkHash(request);

    stage = "check-rate-limit";
    if (await isRateLimited(user.id, networkHash)) {
      return jsonResponse(
        request,
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        429,
      );
    }

    if (!inviteCode) {
      stage = "register-invalid-attempt";
      await registerAttempt(user.id, networkHash, false);
      return jsonResponse(request, { error: "Código inválido." }, 401);
    }

    stage = "load-existing-access";
    const existingAccess = await getExistingAccess(user.id);

    if (existingAccess.revoked) {
      return jsonResponse(request, { error: "Sessão revogada." }, 403);
    }

    const existingGuest = existingAccess.guest;

    if (existingGuest) {
      if (existingGuest.invite_code !== inviteCode) {
        stage = "register-mismatched-attempt";
        await registerAttempt(user.id, networkHash, false);
        return jsonResponse(request, { error: "Código inválido." }, 401);
      }

      stage = "refresh-existing-link";
      await linkGuestSession(user.id, existingGuest.id);
      stage = "register-successful-attempt";
      await registerAttempt(user.id, networkHash, true);

      const { invite_code: _inviteCode, ...safeGuest } = existingGuest;

      return jsonResponse(request, { guest: safeGuest });
    }

    stage = "find-guest";
    const { data: guest, error: guestError } = await getGuestByCode(inviteCode);

    if (guestError) {
      throw guestError;
    }

    if (!guest) {
      stage = "register-invalid-attempt";
      await registerAttempt(user.id, networkHash, false);
      return jsonResponse(request, { error: "Código inválido." }, 401);
    }

    stage = "create-guest-link";
    await linkGuestSession(user.id, guest.id);
    stage = "register-successful-attempt";
    await registerAttempt(user.id, networkHash, true);

    return jsonResponse(request, { guest });
  } catch (error) {
    console.error(
      "claim-invite failed:",
      JSON.stringify({
        error: serializeError(error),
        requestId,
        stage,
      }),
    );

    return jsonResponse(
      request,
      {
        error: "Não foi possível validar o convite.",
        requestId,
      },
      500,
    );
  }
});
