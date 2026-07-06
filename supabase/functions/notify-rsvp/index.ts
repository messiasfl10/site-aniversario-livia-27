import { createClient } from "npm:@supabase/supabase-js@2";
// @deno-types="npm:@types/nodemailer@6.4.17"
import nodemailer from "npm:nodemailer@6.9.16";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const adminEmail = Deno.env.get("ADMIN_EMAIL");
const smtpHost = Deno.env.get("SMTP_HOST");
const smtpPort = Number(Deno.env.get("SMTP_PORT") || 587);
const smtpUser = Deno.env.get("SMTP_USER");
const smtpPass = Deno.env.get("SMTP_PASS");
const smtpSecure = Deno.env.get("SMTP_SECURE") === "true";
const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || smtpUser;
const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

if (
  !supabaseUrl ||
  !supabaseAnonKey ||
  !supabaseServiceRoleKey ||
  !adminEmail ||
  !smtpHost ||
  !smtpUser ||
  !smtpPass ||
  !fromEmail
) {
  throw new Error("Missing required RSVP notification environment variables.");
}

const mailer = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  // Port 587 starts without implicit TLS, then must upgrade via STARTTLS.
  requireTLS: !smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  tls: {
    minVersion: "TLSv1.2",
  },
});

type RSVPAction = "created" | "updated";

type RSVPNotificationPayload = {
  rsvpId?: unknown;
};

type RSVPRecord = {
  id: string;
  guest_id: string;
  presence: unknown;
  email: unknown;
  phone: unknown;
  food: unknown;
  message: unknown;
  guest_data: unknown;
  created_at: string;
  updated_at: string;
};

type GuestProfile = {
  id: string;
  name: string;
  invite_type: "individual" | "couple";
};

type RSVPDetails = {
  action: RSVPAction;
  inviteType: GuestProfile["invite_type"];
  guestName: string;
  presence: string;
  email: string;
  phone: string;
  food: string;
  message: string;
  guestCount: number;
  companions: string[];
  members: string[];
};

type EmailRow = [string, string];

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

  return { message: String(error) };
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatList(values: string[]) {
  return values.length ? values.join(", ") : "Nenhum";
}

function getGuestData(rsvp: RSVPRecord) {
  return isRecord(rsvp.guest_data) ? rsvp.guest_data : {};
}

function extractNames(
  items: unknown,
  formatter: (item: Record<string, unknown>) => string,
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter(isRecord)
    .map(formatter)
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildDetails(
  action: RSVPAction,
  guest: GuestProfile,
  rsvp: RSVPRecord,
): RSVPDetails {
  const guestData = getGuestData(rsvp);
  const companions = extractNames(guestData.companions, (companion) => {
    const name = asString(companion.name);
    const childLabel =
      asString(companion.is_child) === "Sim" ? " - criança" : "";

    return name ? `${name}${childLabel}` : "";
  });
  const members = extractNames(guestData.members, (member) => {
    const name = asString(member.name);
    const presence = asString(member.presence);

    return name && presence ? `${name}: ${presence}` : name;
  });

  return {
    action,
    inviteType: guest.invite_type,
    guestName: guest.name,
    presence: asString(rsvp.presence),
    email: asString(rsvp.email),
    phone: asString(rsvp.phone),
    food: asString(rsvp.food),
    message: asString(rsvp.message),
    guestCount: Number(guestData.guest_count || companions.length || 0),
    companions,
    members,
  };
}

function getGuestCopy(details: RSVPDetails) {
  const updated = details.action === "updated";
  const isCouple = details.inviteType === "couple";

  if (isCouple) {
    return {
      subject: updated
        ? "A confirmação de vocês foi atualizada 💜"
        : "Recebemos a confirmação de vocês 💜",
      intro: updated
        ? "A resposta de vocês para o aniversário da Livia foi atualizada com sucesso."
        : "A resposta de vocês para o aniversário da Livia foi recebida com sucesso.",
      thanks: "Obrigada por responderem o RSVP. 💜",
    };
  }

  return {
    subject: updated
      ? "Sua confirmação de presença foi atualizada 💜"
      : "Recebemos sua confirmação de presença 💜",
    intro: updated
      ? "Sua resposta para o aniversário da Livia foi atualizada com sucesso."
      : "Sua resposta para o aniversário da Livia foi recebida com sucesso.",
    thanks: "Obrigada por responder o RSVP. 💜",
  };
}

function buildGuestEmail(details: RSVPDetails) {
  const copy = getGuestCopy(details);

  const text = [
    `Olá, ${details.guestName}!`,
    "",
    copy.intro,
    "",
    `Presença: ${details.presence}`,
    `Acompanhantes: ${details.guestCount}`,
    details.food ? `Restrição alimentar: ${details.food}` : "",
    "",
    copy.thanks,
  ].filter(Boolean).join("\n");

  const html = `
    <p>Olá, <strong>${escapeHtml(details.guestName)}</strong>!</p>
    <p>${escapeHtml(copy.intro)}</p>
    <ul>
      <li><strong>Presença:</strong> ${escapeHtml(details.presence)}</li>
      <li><strong>Acompanhantes:</strong> ${details.guestCount}</li>
      ${
        details.food
          ? `<li><strong>Restrição alimentar:</strong> ${escapeHtml(details.food)}</li>`
          : ""
      }
    </ul>
    <p>${escapeHtml(copy.thanks)}</p>
  `;

  return { subject: copy.subject, text, html };
}

function buildAdminEmail(details: RSVPDetails) {
  const updated = details.action === "updated";
  const isCouple = details.inviteType === "couple";
  const subject = updated
    ? `RSVP atualizado: ${details.guestName} 💜`
    : `Novo RSVP: ${details.guestName} 💜`;
  const title = updated ? "RSVP atualizado 💜" : "Novo RSVP recebido 💜";
  const rows: EmailRow[] = [
    [isCouple ? "Convite do casal" : "Convidado", details.guestName],
    ["Tipo de convite", isCouple ? "Casal" : "Individual"],
    ["Presença", details.presence],
    ["E-mail", details.email],
    ["Telefone", details.phone || "-"],
    ["Acompanhantes", String(details.guestCount)],
    ...(isCouple
      ? [["Respostas do casal", formatList(details.members)] as EmailRow]
      : []),
    ["Lista de acompanhantes", formatList(details.companions)],
    ["Restrição alimentar", details.food || "-"],
    ["Mensagem", details.message || "-"],
  ];

  const text = [
    title,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;"><strong>${escapeHtml(label)}</strong></td>
          <td style="padding:6px 0;">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join("");
  const html = `
    <p><strong>${escapeHtml(title)}</strong></p>
    <table>${htmlRows}</table>
  `;

  return { subject, text, html };
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  await mailer.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
    text,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  try {
    const token = getBearerToken(request);

    if (!token) {
      return jsonResponse(request, { error: "Missing authorization token." }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: guests, error: guestError } = await supabase.rpc(
      "get_current_guest_profile",
    );

    if (guestError) {
      throw guestError;
    }

    const guest = Array.isArray(guests)
      ? guests[0] as GuestProfile | undefined
      : undefined;

    if (!guest) {
      return jsonResponse(request, { error: "Guest session not found." }, 401);
    }

    const body = await request.json() as RSVPNotificationPayload;
    const rsvpId = asString(body.rsvpId);

    if (!rsvpId) {
      return jsonResponse(request, { error: "Invalid RSVP payload." }, 400);
    }

    // This query runs with the guest token, so RLS remains the source of truth.
    const { data: rsvp, error: rsvpError } = await supabase
      .from("rsvps")
      .select(
        "id, guest_id, presence, email, phone, food, message, guest_data, created_at, updated_at",
      )
      .eq("id", rsvpId)
      .eq("guest_id", guest.id)
      .maybeSingle<RSVPRecord>();

    if (rsvpError) {
      throw rsvpError;
    }

    if (!rsvp) {
      return jsonResponse(request, { error: "RSVP not found." }, 404);
    }

    const action: RSVPAction = rsvp.created_at === rsvp.updated_at
      ? "created"
      : "updated";
    const details = buildDetails(action, guest, rsvp);

    if (!isValidEmail(details.email)) {
      return jsonResponse(request, { error: "Invalid guest email." }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { error: claimError } = await serviceClient
      .from("rsvp_email_deliveries")
      .insert({
        guest_id: guest.id,
        rsvp_id: rsvp.id,
        rsvp_updated_at: rsvp.updated_at,
      });

    if (claimError?.code === "23505") {
      return jsonResponse(request, { ok: true, duplicate: true });
    }

    if (claimError) {
      throw claimError;
    }

    const guestEmail = buildGuestEmail(details);
    const adminNotification = buildAdminEmail(details);

    try {
      await Promise.all([
        sendEmail(
          details.email,
          guestEmail.subject,
          guestEmail.html,
          guestEmail.text,
        ),
        sendEmail(
          adminEmail,
          adminNotification.subject,
          adminNotification.html,
          adminNotification.text,
        ),
      ]);

      const { error: deliveryError } = await serviceClient
        .from("rsvp_email_deliveries")
        .update({ sent_at: new Date().toISOString() })
        .eq("rsvp_id", rsvp.id)
        .eq("rsvp_updated_at", rsvp.updated_at);

      if (deliveryError) {
        console.error("Unable to mark RSVP email as sent:", deliveryError);
      }
    } catch (emailError) {
      // Keep the claim: one recipient may already have accepted the message.
      const { error: failureError } = await serviceClient
        .from("rsvp_email_deliveries")
        .update({ failed_at: new Date().toISOString() })
        .eq("rsvp_id", rsvp.id)
        .eq("rsvp_updated_at", rsvp.updated_at);

      if (failureError) {
        console.error("Unable to mark RSVP email as failed:", failureError);
      }
      throw emailError;
    }

    return jsonResponse(request, { ok: true });
  } catch (error) {
    console.error(
      "notify-rsvp failed:",
      JSON.stringify(serializeError(error)),
    );

    return jsonResponse(request, { error: "Unable to send RSVP notification." }, 500);
  }
});
