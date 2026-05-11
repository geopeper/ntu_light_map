function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToJson(value) {
  const bytes = base64UrlToBytes(value);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function normalizeTeamDomain(domain) {
  if (!domain) return "";
  const withScheme = domain.startsWith("http://") || domain.startsWith("https://")
    ? domain
    : `https://${domain}`;
  return withScheme.replace(/\/+$/, "");
}

async function verifyJwtSignature(jwt, teamDomain) {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const header = base64UrlToJson(encodedHeader);
  if (header.alg !== "RS256" || !header.kid) return null;

  const certsResponse = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
  if (!certsResponse.ok) return null;

  const certs = await certsResponse.json();
  const jwk = certs.keys?.find((key) => key.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlToBytes(encodedSignature);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
  return valid ? base64UrlToJson(encodedPayload) : null;
}

export async function getAccessEmail(request, env) {
  const devEmail = request.headers.get("x-dev-user-email");
  if (env.ALLOW_DEV_AUTH === "true" && devEmail) {
    return devEmail.toLowerCase();
  }

  const jwt = request.headers.get("cf-access-jwt-assertion");
  const teamDomain = normalizeTeamDomain(env.ACCESS_TEAM_DOMAIN);
  const accessAud = env.ACCESS_AUD;

  if (!jwt || !teamDomain || !accessAud) return null;

  const payload = await verifyJwtSignature(jwt, teamDomain);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;
  if (payload.iss && payload.iss.replace(/\/+$/, "") !== teamDomain) return null;

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(accessAud)) return null;

  return typeof payload.email === "string" ? payload.email.toLowerCase() : null;
}

export function isAllowedNtuEmail(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@ntu.edu.tw");
}
