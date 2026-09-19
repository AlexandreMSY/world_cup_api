# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS TypeScript API. Application bootstrap and global configuration
live in `src/main.ts` and `src/app.module.ts`. Keep each domain in a feature
directory under `src/`: for example, `src/auth/` and `src/api-keys/` contain
their module, controller, service, `dto/`, `entities/`, guards, and adjacent
unit specs. Use `.js` extensions for local imports because the project uses
NodeNext modules. End-to-end tests are in `test/`; compiled output is `dist/`.

## Build, Test, and Development Commands

- `npm run start:dev` starts the API in watch mode.
- `npm run start` starts it once; `npm run start:prod` runs the compiled app.
- `npm run build` compiles the project with Nest.
- `npm test` runs the Vitest unit suite; `npm run test:e2e` runs e2e tests.
- `npm run lint` checks `src/` and `test/` with oxlint.
- `npm run format` applies Prettier to TypeScript sources and tests.

Run `npm test`, `npm run lint`, and `npm run build` before opening a pull
request. Local Swagger documentation is served at `/docs` while the app runs.

## Coding Style & Naming Conventions

Use TypeScript classes and Nest decorators. Prettier enforces single quotes
and trailing commas; use two-space indentation. Keep controllers thin and put
persistence and domain logic in services. Name TypeScript values in
`camelCase`, classes and DTOs in `PascalCase`, and database columns in
`snake_case` (for example, `password_hash`). Keep request and response DTOs
separate when response fields differ from persistence fields. Add Swagger
decorators to public controllers and DTO properties when adding endpoints.

## Testing Guidelines

Place unit specs next to the unit they cover as `*.spec.ts`. Use Vitest mocks
and Nest's `TestingModule` to test controller delegation, service behavior,
validation boundaries, and authorization failures. Add e2e coverage in
`test/` for behavior that requires the full HTTP application.

## Security & Configuration

Local settings belong in `.env`, which is ignored by Git. Configure PostgreSQL
with `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME`; never
commit credentials or JWT secrets. API-key management uses JWT Bearer tokens;
future football endpoints will use the `X-API-Key` header.

## Commit & Pull Request Guidelines

Recent commits use short imperative summaries, such as `Add auth and API key
routes`. Keep commits focused and use the same style. Pull requests should
describe the behavior change, list validation commands run, link relevant
issues when available, and include Swagger screenshots or request/response
examples for API-contract changes.
