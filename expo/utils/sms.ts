/**
 * SMS utilities — calls the Cloudflare Worker which proxies to Go High Level.
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_RORK_FUNCTIONS_URL as string;

interface SyncResult {
  ok: boolean;
  contactId?: string;
  error?: string;
}

interface SendResult {
  ok: boolean;
  error?: string;
}

/** Register a phone number with GHL — find or create a contact. Returns the GHL contactId. */
export async function syncContact(phone: string): Promise<SyncResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/sms/sync-contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    return data as SyncResult;
  } catch (e) {
    console.log("[SMS] syncContact error", e);
    return { ok: false, error: "Network error" };
  }
}

/** Send an SMS alert via GHL. Requires a synced contactId. */
export async function sendSms(contactId: string, message: string): Promise<SendResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, message }),
    });
    const data = await res.json();
    return data as SendResult;
  } catch (e) {
    console.log("[SMS] sendSms error", e);
    return { ok: false, error: "Network error" };
  }
}

/** Format a notification into a concise SMS body (max 160 chars for best deliverability). */
export function formatSmsAlert(title: string, body: string): string {
  const prefix = "⚖️ Tort Market: ";
  const maxLen = 150 - prefix.length;
  let text = `${title}. ${body}`;
  if (text.length > maxLen) {
    text = text.slice(0, maxLen - 3) + "...";
  }
  const footer = "\n\nReply STOP to cancel";
  const combined = prefix + text;
  if (combined.length + footer.length <= 160) return combined + footer;
  return combined.slice(0, 160 - footer.length) + footer;
}
