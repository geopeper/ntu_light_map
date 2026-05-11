# Cloudflare deployment notes

## Pages project

Use the Cloudflare dashboard:

1. Go to **Workers & Pages**.
2. Select **Create application**.
3. Select **Pages**.
4. Connect this GitHub repository.
5. Use these build settings:
   - Framework preset: **None**
   - Build command: leave empty
   - Build output directory: `/`
6. Deploy the project.

The static map and `functions/` API routes are deployed together as a Cloudflare Pages
project.

## D1 database

Use the Cloudflare dashboard:

1. Go to **Workers & Pages**.
2. Open **D1 SQL Database**.
3. Select **Create database**.
4. Name it `ntu-light-map`.
5. Copy the database ID into `wrangler.toml` under `database_id`.

Then bind the database to the Pages project:

1. Open the Pages project.
2. Go to **Settings**.
3. Open **Bindings**.
4. Add a **D1 database binding**.
5. Set the binding name to `DB`.
6. Select the `ntu-light-map` database.
7. Save and redeploy.

Run the production migrations after the database exists:

```sh
npm run d1:migrate:remote
```

Cloudflare's dashboard can create and bind the database, but the checked-in migration files
are still applied with Wrangler.

## Email verification variables

The app verifies reporters by sending a one-time code to an `@ntu.edu.tw` address.
The sender account is:

```text
light-map@ntusa.ntu.edu.tw
```

In the Pages project:

1. Go to **Settings**.
2. Open **Variables and Secrets**.
3. Add these production variables:

```text
HASH_SALT=<random secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=light-map@ntusa.ntu.edu.tw
SMTP_FROM=light-map@ntusa.ntu.edu.tw
```

4. Add this production secret with **Encrypt** enabled:

```text
SMTP_PASS=<app password>
```

Do not commit the app password. `HASH_SALT` is used before hashing reporter emails,
session tokens, verification codes, and IP addresses.

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
