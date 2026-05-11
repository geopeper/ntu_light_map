# Cloudflare deployment notes

## D1

Create a D1 database and copy its database ID into `wrangler.toml`.

```sh
wrangler d1 create ntu-light-map
wrangler d1 migrations apply ntu-light-map --remote
```

For local development, apply the same migrations locally:

```sh
wrangler d1 migrations apply ntu-light-map --local
```

## Access

Create a Cloudflare Access self-hosted application for the protected API path:

```text
https://<your-domain>/api/protected/*
```

Use One-time PIN as the login method and set the policy:

```text
Allow: Emails ending in ntu.edu.tw
Session duration: 30 days
```

Keep the public map and `GET /api/incidents` outside Access. Only submit endpoints under
`/api/protected/*` require an NTU email session.

## Environment

Set these values before deploying:

```text
ACCESS_TEAM_DOMAIN=<your-team>.cloudflareaccess.com
ACCESS_AUD=<Access application audience tag>
HASH_SALT=<random secret>
```

`ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are used by the Worker to verify the Access JWT.
`HASH_SALT` is used before hashing reporter emails and IP addresses for rate limiting.

For local API testing only, you can set:

```text
ALLOW_DEV_AUTH=true
```

Then send `x-dev-user-email: someone@ntu.edu.tw` to protected endpoints.
Do not enable `ALLOW_DEV_AUTH` in production.
