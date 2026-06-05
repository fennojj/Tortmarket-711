// Tort Market — Cloudflare Worker backend
//
// Endpoints:
//   POST /sms/sync-contact  — find or create a GHL contact for a phone number
//   POST /sms/send          — send an SMS alert to a GHL contact

const GHL_BASE = "https://services.leadconnectorhq.com";

interface Env {
  GHL_API_TOKEN: string;
  GHL_LOCATION_ID: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function cors(response: Response): Response {
  for (const [k, v] of Object.entries(CORS)) {
    response.headers.set(k, v);
  }
  return response;
}

function ghlHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `Bearer ${env.GHL_API_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function findContactByPhone(
  phone: string,
  locationId: string,
  env: Env,
): Promise<string | null> {
  try {
    const url = `${GHL_BASE}/contacts/lookup?phone=${encodeURIComponent(phone)}&locationId=${locationId}`;
    const res = await fetch(url, { headers: ghlHeaders(env) });
    if (!res.ok) return null;
    const data = (await res.json()) as { contacts?: { id: string }[] };
    return data.contacts?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function createContact(
  phone: string,
  locationId: string,
  env: Env,
): Promise<string | null> {
  try {
    const body = {
      phone,
      locationId,
      // Minimal contact — name can be updated later
      firstName: "Tort Market",
      lastName: "Trader",
    };
    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: ghlHeaders(env),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[GHL] create contact failed", res.status);
      return null;
    }
    const data = (await res.json()) as { contact?: { id: string } };
    return data.contact?.id ?? null;
  } catch (e) {
    console.error("[GHL] create contact error", e);
    return null;
  }
}

async function sendSms(
  contactId: string,
  message: string,
  env: Env,
): Promise<boolean> {
  try {
    const body = {
      type: "SMS",
      contactId,
      message,
    };
    const res = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: "POST",
      headers: ghlHeaders(env),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("[GHL] send SMS failed", res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[GHL] send SMS error", e);
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return cors(new Response(null, { status: 204 }));
    }

    // POST /sms/sync-contact — find or create GHL contact by phone
    if (url.pathname === "/sms/sync-contact" && request.method === "POST") {
      try {
        const body = (await request.json()) as { phone: string };
        const phone = (body.phone ?? "").replace(/\D/g, "");

        if (!phone || phone.length < 10) {
          return cors(
            Response.json({ ok: false, error: "Invalid phone number" }, { status: 400 }),
          );
        }

        if (!env.GHL_API_TOKEN || !env.GHL_LOCATION_ID) {
          return cors(
            Response.json(
              { ok: false, error: "GHL not configured — add GHL_API_TOKEN and GHL_LOCATION_ID env vars" },
              { status: 500 },
            ),
          );
        }

        const locationId = env.GHL_LOCATION_ID;

        // Try to find existing contact
        let contactId = await findContactByPhone(phone, locationId, env);

        // If not found, create one
        if (!contactId) {
          contactId = await createContact(phone, locationId, env);
        }

        if (!contactId) {
          return cors(
            Response.json({ ok: false, error: "Failed to create GHL contact" }, { status: 500 }),
          );
        }

        console.log("[SMS] contact synced", { phone: phone.slice(-4), contactId });
        return cors(Response.json({ ok: true, contactId }));
      } catch (e) {
        console.error("[SMS] sync-contact error", e);
        return cors(Response.json({ ok: false, error: "Internal error" }, { status: 500 }));
      }
    }

    // POST /sms/send — send an SMS alert
    if (url.pathname === "/sms/send" && request.method === "POST") {
      try {
        const body = (await request.json()) as {
          contactId: string;
          message: string;
        };

        if (!body.contactId || !body.message) {
          return cors(
            Response.json({ ok: false, error: "contactId and message are required" }, { status: 400 }),
          );
        }

        if (!env.GHL_API_TOKEN) {
          return cors(
            Response.json(
              { ok: false, error: "GHL not configured" },
              { status: 500 },
            ),
          );
        }

        const sent = await sendSms(body.contactId, body.message, env);

        if (!sent) {
          return cors(
            Response.json({ ok: false, error: "GHL send failed" }, { status: 500 }),
          );
        }

        console.log("[SMS] sent", { contactId: body.contactId.slice(0, 8) });
        return cors(Response.json({ ok: true }));
      } catch (e) {
        console.error("[SMS] send error", e);
        return cors(Response.json({ ok: false, error: "Internal error" }, { status: 500 }));
      }
    }

    // Health check
    if (url.pathname === "/ping") {
      return cors(Response.json({ ok: true, now: new Date().toISOString() }));
    }

    return cors(Response.json({ ok: true, hello: "Tort Market backend" }));
  },
} satisfies ExportedHandler<Env>;
