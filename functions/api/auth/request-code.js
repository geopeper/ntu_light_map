import { authRateLimited, isAllowedNtuEmail, randomDigits } from "../../_shared/auth.js";
import { badRequest, json, methodNotAllowed } from "../../_shared/http.js";
import { clientIp, hashValue } from "../../_shared/incidents.js";
import { sendVerificationEmail } from "../../_shared/smtp.js";

export async function onRequestPost({ request, env }) {
  let input;
  try {
    input = await request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const email = String(input?.email || "").trim().toLowerCase();
  if (!isAllowedNtuEmail(email)) {
    return badRequest("invalid_email");
  }
  if (await authRateLimited(request, env, email)) {
    return json({ error: "rate_limited" }, { status: 429 });
  }

  const code = env.DEV_EMAIL_CODE && env.ALLOW_DEV_AUTH === "true"
    ? env.DEV_EMAIL_CODE
    : randomDigits(6);
  const codeHash = await hashValue(`${email}:${code}`, env.HASH_SALT || "");
  const ipHash = await hashValue(clientIp(request), env.HASH_SALT || "");

  await env.DB.prepare(
    `INSERT INTO email_verification_codes (email, code_hash, ip_hash, expires_at)
     VALUES (?, ?, ?, datetime('now', '+10 minutes'))`,
  ).bind(email, codeHash, ipHash).run();

  await sendVerificationEmail(env, { to: email, code });
  return json({ ok: true });
}

export function onRequestGet() {
  return methodNotAllowed(["POST"]);
}
