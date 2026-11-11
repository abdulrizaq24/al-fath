# Agent Instructions

## Repository scope

- The active application is `pharmacy_flutter/`: an offline Flutter desktop/mobile app using Drift/SQLite and Riverpod. The root README's setup commands are the canonical quick start.
- `docs/reference/` contains an older Express/Prisma backend, Next.js frontend, and Electron wrapper for reference only; do not modify it unless the task explicitly targets the reference implementation. Its nested `frontend-master/AGENTS.md` applies only to that legacy frontend.
- Product and architecture context is in `docs/ARCHITECTURE.md`, `docs/DATABASE_SCHEMA.md`, and `docs/PRD.md`; workflow details for the legacy stack are in `docs/reference/WORKFLOW.md`.

## Flutter development

- Run from `pharmacy_flutter/`:
  - `flutter pub get`
  - `dart run build_runner build --delete-conflicting-outputs` (after changing Drift or generated Riverpod sources)
  - `flutter run -d windows`
  - `flutter test`
- `lib/data/database/database.g.dart` is generated; do not hand-edit it. Regenerate it with build_runner, including `--delete-conflicting-outputs` when stale generated files cause conflicts.
- The app is deliberately local/offline: persistence is SQLite through Drift, not the PostgreSQL/Node services in `docs/reference/`. Preserve FEFO batch allocation and transaction boundaries when changing inventory, sales, purchases, or prescriptions.
- Main wiring is in `lib/`; domain operations are concentrated in `lib/services/`, state in `lib/providers/`, and screens in `lib/ui/`. Keep database access and business rules out of page widgets when extending features.
- Windows builds require Flutter, Visual Studio's C++ desktop development workload, and Windows Developer Mode (or Administrator privileges) enabled for Flutter plugin symlinks. The app supports English and Arabic RTL, so UI changes must preserve localization and directionality.

## Legacy reference stack (only when requested)

- Backend: `cd docs/reference/pharmacy-management-backend-master && npm run dev|build|start`; it is TypeScript ESM and uses Prisma/PostgreSQL.
- Frontend: `cd docs/reference/pharmacy-management-frontend-master && npm run dev|build|start|lint`. This uses Next 16; read the nested `AGENTS.md` and the relevant installed Next docs before editing.
- Electron packaging expects backend `dist`, frontend `.next/standalone`, static/public assets, and backend production dependencies. Build those inputs before running `npm run build` in `docs/reference/pharmacy-management-desktop-desktop-app`.
- Packaged Electron startup creates a per-user `.env` and requires PostgreSQL credentials and JWT settings before restart; this does not apply to the active Flutter app.
