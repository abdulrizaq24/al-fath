# Pharmacy Management System – Workflow

```mermaid
flowchart TD
    A[Start Application] --> B{Run Mode}
    B -->|Desktop (Electron)| C[Electron Wrapper]
    C --> D[Spawn Backend (dist/server.js)]
    C --> E[Spawn Frontend (.next/standalone/server.js)]
    D --> F[Health Check `/api/health`]
    E --> G[Wait for http://localhost:3000]
    F --> H[Electron opens BrowserWindow -> http://localhost:3000]
    H --> I[User Login (JWT issued)]
    I --> J{Dashboard}
    J --> K[View Statistics]
    J --> L[Manage Inventory]
    L --> M[Add / Edit Medicines & Batches]
    L --> N[Low‑stock / Expiring alerts]
    J --> O[Handle Purchases]
    O --> P[Create Purchase → DB transaction]
    P --> Q[Receive Goods → Batch creation & inventory update]
    J --> R[Handle Sales (POS)]
    R --> S[Create Sale → FEFO batch allocation]
    S --> T[Payment processing]
    J --> U[Prescriptions]
    U --> V[Create / Dispense prescription items]
    J --> W[Reports]
    W --> X[Generate PDF / CSV]
    X --> Y[Export / Print]
    Y --> Z[Logout]
    Z --> A
```

**Key flows**
- **Backend**: Express routes (`/api/*`) protected by `auth.middleware`. Business logic lives in `src/modules/*/service.ts` and uses Prisma transactions for atomic operations (sales, purchases, receipts).
- **Frontend**: Next.js pages call `apiFetch` (`lib/api.ts`) which adds the JWT from `localStorage`. UI components are in `components/ui`.
- **Desktop**: `index.js` ensures a production `.env` (generated on first run), spawns backend & frontend, waits for health endpoints, then shows the UI.
- **Data persistence**: PostgreSQL via Prisma schema (`prisma/schema.prisma`). Migrations in `prisma/migrations`.
