# Missão 2 · Protótipo funcional

Prazo: 13/11 às 10h até 14/11 às 10h.

| Evidência | Onde está |
|---|---|
| Código do frontend (React 19 + TypeScript + Three.js modularizado) | [`frontend`](../../frontend) |
| Código da API (Python + FastAPI + Auth HMAC + SQLite/Postgres + ETag) | [`api`](../../api) |
| Serviço de Visão Computacional Edge (YOLO + OpenCV anônimo) | [`computer-vision`](../../computer-vision) |
| Protótipo publicado em Produção (Vercel) | https://vitrineiq-capim-dourado.vercel.app |
| API & Swagger em Produção (Vercel) | https://vitrineiq-hackarun-2026-api.vercel.app/docs |
| Testes automatizados Frontend (`51` testes verdes em `5` arquivos) | `npm --prefix frontend run test` (`Vitest`) + `npx tsc --noEmit` |
| Testes automatizados Backend (`107` testes verdes) | `api/.venv/bin/python -m pytest -q api/tests` (`pytest`) |
| Pipeline CI + Smoke E2E/WCAG (`Playwright` + `axe-core`) | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) + [`frontend/scripts/e2e-smoke.mjs`](../../frontend/scripts/e2e-smoke.mjs) |
| Auditoria Técnica & Score Final (**`9.8 / 10`**) | Modularização `3D`/`App`/`Cockpit`/`Vision`, CSP estrita sem `'unsafe-inline'`, fontes auto-hospedadas (`@fontsource-variable`), validação `?etag=` CORS-safe na Vercel Edge, fila offline no Balcão e `PATCH /api/auth/senha` |
| Link do Figma | https://www.figma.com/design/vS3M7A1YAChjL2YUI2XTKY/VitrineIQ---Prot%C3%B3tipo-Miss%C3%A3o-2?node-id=0-1&t=hRry2StnEP8LUVtu-1 |
