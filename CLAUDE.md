# Cafe-Hub

Full-stack cafe management system for two locations (Atrium & Cleanskin). Handles staff rosters, stock ordering, menu/recipe management, and kitchen tracking.

## Architecture

**Monorepo with two separate Node apps:**

```
cafe-hub/
├── client/   # React 18 + Vite + PWA
└── server/   # Express + MongoDB (Mongoose)
```

- Frontend proxies `/api/*` to `http://localhost:5001` in dev (configured in `vite.config.js`)
- Production: deployed on Render at `https://cafe-hub-crpp.onrender.com`

## Dev Setup

Run both servers simultaneously in separate terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev      # nodemon on port 5001

# Terminal 2 — frontend
cd client && npm run dev      # Vite on port 5173
```

Seed the database:
```bash
node server/seed.js   # WARNING: clears and recreates all collections
```

## Environment Variables

**Server** (`server/.env`) — see `server/.env.example`:
- `MONGODB_URI` — MongoDB Atlas connection string
- `PORT` — default 5001
- `JWT_SECRET` — token signing secret
- `RESEND_API_KEY` — email service key
- `FROM_EMAIL` — sender address
- `ALLOWED_ORIGINS` — comma-separated CORS origins

**Client** (`client/.env.production`):
- `VITE_API_URL` — production server URL

## Roles & Access Control

Roles are enforced both client-side (tab visibility in `client/src/App.jsx`) and server-side (middleware in `server/middleware/auth.js`).

| Role | Access |
|------|--------|
| `boss` | All tabs + user management + settings |
| `teamleader` | Roster, stock, menu, recipes, users (limited) |
| `atrium` | Atrium roster, menu, recipes |
| `cleanskin` | Cleanskin roster, menu, recipes |
| `warehouse` | Approved orders only |

Server guards: `requireBoss()` and `requireTeamLeaderOrBoss()` from `server/middleware/auth.js`.

## Key Files

### Client
- `client/src/App.jsx` — main router, role-based tab rendering
- `client/src/api.js` — Axios wrapper that injects JWT into every request
- `client/src/context/AuthContext.jsx` — login/logout/token state
- `client/src/context/AppContext.jsx` — global toast notifications
- `client/src/pages/` — one file per feature page

### Server
- `server/index.js` — Express entry point, middleware, route mounting
- `server/models/` — 9 Mongoose schemas (User, Shift, MenuItem, Recipe, StockRequest, Product, KitchenNeed, RosterPublish, Settings)
- `server/routes/` — 8 route files mirroring the models
- `server/utils/email.js` — Resend email sender (supports attachments)
- `server/utils/generateOrderPdf.js` — PDFKit stock order PDF
- `server/utils/generateRosterPdf.js` — PDFKit weekly roster PDF

## Data Models — Quick Reference

- **User** — roles: `boss | atrium | cleanskin | warehouse | teamleader`; password bcrypt-hashed
- **Shift** — `{ day, name, store, time, weekOf }` — weekly roster entries
- **StockRequest** — `{ item, qty, store, status, urgent }` — approval workflow
- **RosterPublish** — tracks which store/week rosters have been published
- **Settings** — singleton doc with supplier email, boss email, store emails

## Common Workflows

**Roster flow:** Draft shifts (Roster page) → publish → PDF generated → emailed to staff

**Stock flow:** Staff request item → teamleader/boss approves → PDF generated → emailed to supplier

**User creation:** Boss creates account → credentials emailed via Resend → user logs in and changes password

## Conventions

- ES modules (`"type": "module"` in server `package.json`) — use `import/export` everywhere on the server
- JWT tokens expire after 7 days; stored in `localStorage` on the client
- API errors return `{ message: "..." }` with appropriate HTTP status codes
- Toast notifications for user feedback — call `showToast(message, type)` from `AppContext`
- Week identification uses Monday's date as `weekOf` (see `client/src/utils/week.js`)

## Database Scripts

One-off maintenance scripts in `server/scripts/` — run with `node server/scripts/<name>.js`. Review before running; some mutate data.
