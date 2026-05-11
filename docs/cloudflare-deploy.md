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

## Email verification

The app verifies reporters by sending a one-time code to an `@ntu.edu.tw` address.
The sender account is:

```text
light-map@ntusa.ntu.edu.tw
```

Store the app password as a Cloudflare Pages secret named `SMTP_PASS`. Do not commit it.

Required production variables:

```text
HASH_SALT=<random secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=light-map@ntusa.ntu.edu.tw
SMTP_FROM=light-map@ntusa.ntu.edu.tw
```

Required production secret:

```text
SMTP_PASS=<app password>
```

`HASH_SALT` is used before hashing reporter emails, session tokens, verification codes,
and IP addresses.

## Local development

Wrangler Pages Functions reads local bindings from `.dev.vars`, so create it from the
example file:

```sh
cp .dev.vars.example .dev.vars
```

For local testing, `.dev.vars.example` enables `ALLOW_DEV_AUTH=true` and sets
`DEV_EMAIL_CODE=123456`, so the app can verify without sending real email.

Then run:

```sh
npm run d1:migrate:local
npm run dev:auth
```

Only run one dev server at a time. `npm run dev` and `npm run dev:auth` both use port
`8788`, so starting both will fail with `Address already in use`.

`npm run dev` starts Cloudflare Pages Functions locally. A plain static server will show
`Cannot GET /api/protected/session` because it does not run the Functions runtime.
Do not enable `ALLOW_DEV_AUTH` in production.
