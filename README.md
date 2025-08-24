# CodeStruct.AI

Automated code quality platform with an Analyze → Generate → Validate workflow.

## Monorepo
- backend: NestJS + Prisma + PostgreSQL
- frontend: React (Vite + TS) + Tailwind

## Dev quickstart (local)
- Install Node 18+ and PostgreSQL 14+ locally.
- Create a database (e.g., codestruct) and set `DATABASE_URL` in `backend/.env`.
- Optionally set `OPENAI_API_KEY` for refactoring features.

```powershell
# from repo root
npm install
npm run dev:backend
npm run dev:frontend
```

Backend runs on http://localhost:3000
Frontend runs on http://localhost:5173
Postgres default on localhost:5432

### Windows local dev (optional)
Native modules like Tree-sitter may require build tools:
- Install Visual Studio Build Tools 2022 with C++ workload, or use WSL2 Ubuntu.
- Then reinstall dependencies in `backend/`.

## Environment
- DATABASE_URL set in backend/.env
- OPENAI_API_KEY optional for refactoring generation

## Tree-sitter notes (parsing)
- The backend prefers Tree-sitter for ASTs and falls back to TypeScript compiler for TS/JS when native bindings are missing.
- Windows tips (local runs):
	- Install Visual Studio Build Tools 2022 with C++ workload, or use WSL2 Ubuntu.
	- Then reinstall backend deps in `backend/`.
	- The service also attempts `node-tree-sitter` as a fallback module name.

The AnalysisService reuses a single Tree-sitter instance from ParserService for efficiency. When unavailable, analysis still runs with text/TS-compiler heuristics.

## Prisma
Inside backend:
- `npm run prisma:generate`
- `npm run prisma:migrate`

## License
MIT
