# CodeStruct.AI

Automated code quality platform with an Analyze → Generate → Validate workflow.

**✨ NEW:** AI-powered code refactoring with FREE Google Gemini API!

## Monorepo
- backend: NestJS + Prisma + PostgreSQL + Gemini AI
- frontend: React (Vite + TS) + Tailwind

## Features

🔍 **Smart Code Analysis** - Detects 10+ code smells with AST parsing  
🤖 **AI Refactoring** - Generates fixes using Google Gemini (FREE!)  
📊 **Visual Analytics** - Dashboard with metrics and trends  
🎯 **Context-Aware** - Understands orchestration patterns and test files  
⚡ **Fast & Free** - Gemini 1.5 Flash with 1,500 requests/day free tier  

## Dev quickstart (local)
- Install Node 18+ and PostgreSQL 14+ locally.
- Create a database (e.g., codestruct) and set `DATABASE_URL` in `backend/.env`.
- Get your FREE Gemini API key at https://aistudio.google.com/app/apikey
- Set `GEMINI_API_KEY` in `backend/.env` for AI refactoring.

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
- `DATABASE_URL` - PostgreSQL connection string (required)
- `GEMINI_API_KEY` - Google Gemini API key for AI refactoring (FREE! Get at https://aistudio.google.com/app/apikey)
- `FRONTEND_ORIGIN` - CORS origin (default: http://localhost:5173)

See `backend/.env.example` for template.

## Quick Links

- 📖 [AI Refactoring Guide](./AI_REFACTORING.md) - Full feature documentation
- 🚀 [Setup Guide](./SETUP_AI_REFACTORING.md) - Quick setup checklist
- 🔑 [Get Gemini Key](./GET_GEMINI_API_KEY.md) - Step-by-step API key guide

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
