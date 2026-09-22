# TradeUply Backend

Express-based REST API for TradeUply, written in modern JavaScript using ES modules.

## Requirements

- Node.js 20 or newer
- npm

## Local setup

1. Create a private `.env` file in the project root.
2. Add your MongoDB connection string to `MONGO_URI` in `.env`.
3. Add your Resend API key, verified sender, and OTP hashing secret.
4. Install dependencies with `npm install`.
5. Start development mode with `npm run dev`.

The API runs at `http://localhost:5001` by default. Port 5001 avoids the macOS Control Center service that commonly occupies port 5000.

Example MongoDB Atlas configuration:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-host>/tradeuply?retryWrites=true&w=majority
```

Keep the real connection string only in `.env`. That file is ignored by Git.

Required client-verification configuration:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=TradeUply <accounts@your-verified-domain.com>
OTP_HASH_SECRET=use-a-private-random-value-with-at-least-32-characters
```

The Resend sender address must belong to a domain verified in your Resend account.

## Available commands

- `npm run dev` — start with automatic restart
- `npm start` — start in production mode
- `npm run lint` — check JavaScript quality
- `npm test` — run the API tests

## Deploying to Vercel

The Express application is exported from `src/app.js`, which Vercel deploys as
a single Node.js function. `src/server.js` remains the local development and
traditional Node.js entry point.

1. Import the backend Git repository into Vercel.
2. Select the **Express** application preset.
3. Keep the root directory as `./` when this repository contains only the
   backend.
4. Leave the build command and output directory empty; Express is detected
   automatically.
5. Add the environment variables from your private `.env` file to Production,
   Preview, and Development as needed. Do not commit the `.env` file.
6. Deploy and verify `GET /` and `GET /api/v1/health`.

At minimum, production requires:

```env
NODE_ENV=production
MONGO_URI=...
API_PREFIX=/api/v1
CORS_ORIGIN=https://your-client-domain.com,https://your-admin-domain.com
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
OTP_HASH_SECRET=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=TradeUply <accounts@your-verified-domain.com>
CLOUDINARY_API_SECRET=...
CLOUDINARY_API_KEY=...
CLOUDINARY_CLOUD_NAME=...
```

`CORS_ORIGIN` accepts a comma-separated list of exact frontend origins without
trailing slashes. `PORT` is not required on Vercel. After changing an
environment variable, redeploy so the new value is applied.

## Initial endpoints

- `GET /` — API welcome response
- `GET /api/v1/health` — service health information
- `POST /api/v1/client/signup` — create a pending client and send an email OTP
- `POST /api/v1/client/otp/verify` — verify an OTP and activate the client
- `POST /api/v1/client/otp/resend` — send a replacement OTP after the cooldown

## Structure

```text
src/
  config/       Environment configuration
  controllers/  Request handlers
  models/       MongoDB client and OTP models
  middleware/   Express middleware
  routes/       Versioned API routes
  services/     Client registration, OTP, and Resend business logic
  templates/    Transactional email templates
  validators/   Request validation schemas
  utils/        Shared backend utilities
  app.js        Express application
  server.js     HTTP server entry point
test/           Node test runner tests
```
