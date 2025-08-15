# CodeStruct.AI

Automated code quality platform with an Analyze → Generate → Validate workflow.

## Monorepo
- backend: NestJS + Prisma + PostgreSQL
- frontend: React (Vite + TS) + Tailwind

## Dev quickstart
- Ensure Docker Desktop is running
- Optionally set `OPENAI_API_KEY` in your environment

```powershell
# from repo root
npm install
npm run dev
```

Backend runs on http://localhost:3000
Frontend runs on http://localhost:5173
Postgres on localhost:5432

## Environment
- DATABASE_URL managed by docker-compose
- OPENAI_API_KEY optional for refactoring generation

## Prisma
Inside backend:
- `npm run prisma:generate`
- `npm run prisma:migrate`

## License
MIT
