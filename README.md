# Archipiélago VirtuX

Experiencia educativa inmersiva para el ecosistema VirtuXperience de UNIMINUTO: un archipiélago explorable donde cada isla es una ruta de aprendizaje y el Faro Minuto espera recuperar su luz.

> Proyecto en desarrollo. Este README se completa en la fase de documentación (ver `CLAUDE.md` §15).

## Requisitos

- Node 24 LTS (`.nvmrc`)
- pnpm 9 (`npm i -g pnpm@9`)

## Comandos

```bash
pnpm install
pnpm dev              # http://localhost:5173
pnpm build            # build de producción
pnpm lint && pnpm typecheck
pnpm test             # Vitest
pnpm test:e2e         # Playwright + axe (escritorio y móvil)
```

Una sola prueba:

```bash
pnpm test tests/unit/ui/Button.test.tsx       # un archivo
pnpm test -t "mientras carga"                 # por nombre
pnpm test:e2e tests/e2e/smoke.spec.ts --project=escritorio
```

## Decisiones

Ver [`docs/adr/`](docs/adr/).

## Autor

Mario Mendoza Huertas · [@mariocodem](https://github.com/mariocodem)
