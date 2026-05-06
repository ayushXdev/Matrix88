# Matrix08 — 8×8 HDMI Matrix Switcher Control  v2.0

## What's new in v2.0
| Feature | Details |
|---------|---------|
| **JWT Auth** | Login with `admin/admin123` or `user/user123`. Token stored in localStorage, sent as `Authorization: Bearer` on every API call. |
| **RBAC** | Admin: full access. User: routing only (no TCP config, no labels, no logs, no sync). Backend routes enforce role via `requireAuth` / `requireAdmin` middleware. |
| **Display 3 fix** | `POST /api/switch-multi` sends all outputs in ONE request. Backend staggers TCP SET SW commands 300ms apart so the device never drops a packet. |
| **Credential management** | Admin → "🔑 Credentials" button → modal to change username + password (bcrypt-hashed). |
| **User management** | Admin → "👥 Users" button → add/update/delete users with roles. |
| **Full log history** | Backend keeps logHistory (all types) + rxHistory (RX only). Both hydrated on socket connect. Logs auto-scroll. |

## Default accounts
| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | admin |
| user     | user123  | user  |

## Folder structure
```
MERNM_v2/
├── backend/
│   ├── middleware/auth.js        ← JWT requireAuth / requireAdmin
│   ├── models/User.js            ← bcrypt-hashed user model
│   ├── routes/authRoutes.js      ← login, change-password, user CRUD
│   ├── routes/matrixRoutes.js    ← switch, switch-multi, sync, state, settings
│   ├── services/authService.js   ← dual-storage (MongoDB + JSON file fallback)
│   ├── services/persistence.js   ← TCP settings + matrix snapshot
│   ├── tcpClient.js              ← TCP client with switchMultiple() fix
│   ├── config.js
│   └── server.js
└── frontend/src/
    ├── App.jsx                   ← all UI: login, RBAC, routing, logs, modals
    └── components/LiveRoutingMatrix.jsx
```

## Running
```bash
# Backend
cd backend && npm install && npm start

# Frontend
cd frontend && npm install && npm run dev
```

## Key API endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | public | Returns JWT |
| GET  | `/api/auth/me` | any | Current user info |
| POST | `/api/auth/change-password` | admin | Update own credentials |
| GET  | `/api/auth/users` | admin | List all users |
| POST | `/api/auth/users` | admin | Create/update user |
| DELETE | `/api/auth/users/:u` | admin | Delete user |
| GET  | `/api/state` | any | Matrix state + log history |
| POST | `/api/switch` | any | Route 1 input → 1 output |
| POST | `/api/switch-multi` | any | Route 1 input → N outputs (staggered) |
| POST | `/api/sync-all` | any | Query all 8 outputs |
| GET  | `/api/settings` | admin | TCP config |
| POST | `/api/settings` | admin | Save TCP config + reconnect |
