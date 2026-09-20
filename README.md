# World Cup API

World Cup API is a read-only NestJS and PostgreSQL service for exploring historical FIFA World Cup tournaments, teams, players, matches, stadiums, lineups, goals, bookings, and substitutions.

It includes user registration and login only to issue API keys. Football data is exposed through protected `GET` endpoints; the application does not expose football write endpoints.

## Data source

Historical match data comes from the [OpenFootball `worldcup.json` dataset](https://github.com/openfootball/worldcup.json). The importer fetches one JSON file per World Cup edition from 1930 through 2026, for example:

```text
https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2002/worldcup-full.json
```

Tournament metadata such as the host country is maintained in [scripts/tournament-sources.mjs](scripts/tournament-sources.mjs). The source data is imported as-is where possible: team names, round names, stadium strings, local kickoff times, player names, and match events are not invented or enriched.

## Requirements

- Node.js 18 or newer (Node 24 is used during development)
- PostgreSQL with permission to create the `uuid-ossp` extension
- npm

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file. Never commit its values.

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=replace-me
DB_NAME=world_cup_api
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000

# Optional. Disabled by default. Use a positive hop count or a comma-separated
# list of IP/CIDR addresses when the API runs behind a trusted proxy.
TRUST_PROXY=false
```

Initialize a new or disposable database with the TypeORM migration:

```bash
npm run migration:run
npm run migration:show
```

`migration:show` should show both `InitialSchema1760000000000` and `AddPublicSlugs1760000001000` as applied.

> The initial migration creates the complete schema, including `users` and `api_keys`. If the database contains tables created before migrations were introduced, do not run this migration over them. Use a disposable database/schema, or create a dedicated compatibility migration first.

Start the API in watch mode:

```bash
npm run start:dev
```

The API listens on `http://localhost:3000` by default. Swagger documentation is available at [http://localhost:3000/docs](http://localhost:3000/docs).

## Importing World Cup data

The seed tool is a standalone Node.js script. It is not run by the Nest application and does not create HTTP routes.

Import one edition first:

```bash
npm run seed:football 1930
```

Import every configured edition:

```bash
npm run seed:football
```

The importer uses a transaction per tournament, validates source structure before writing, continues after a failed edition, and exits with a non-zero status if any edition fails. It is idempotent: rerunning an edition updates its tournament/match records and replaces that match's imported lineups and event rows. It assigns and preserves stable public slugs when records are first created.

## Authentication

Football endpoints require an API key in the `X-API-Key` header.

1. Register a user:

   ```http
   POST /auth/register
   Content-Type: application/json

   { "email": "user@example.com", "password": "password123" }
   ```

2. Log in to obtain a JWT:

   ```http
   POST /auth/login
   Content-Type: application/json

   { "email": "user@example.com", "password": "password123" }
   ```

3. Generate an API key with the JWT:

   ```http
   POST /api-key
   Authorization: Bearer <access-token>
   ```

   Store the returned `api_key` securely. It is shown only when generated.

4. Call football endpoints:

   ```http
   GET /tournaments
   X-API-Key: <api-key>
   ```

## API routes

`GET /` is a public health-style response. Authentication and API-key routes have their own requirements; all football routes below require `X-API-Key`.

| Method   | Route                        | Purpose                                                   |
| -------- | ---------------------------- | --------------------------------------------------------- |
| `POST`   | `/auth/register`             | Register a user.                                          |
| `POST`   | `/auth/login`                | Log in and receive a JWT.                                 |
| `POST`   | `/api-key`                   | Generate an API key with a JWT Bearer token.              |
| `DELETE` | `/api-key`                   | Deactivate the active API key with a JWT Bearer token.    |
| `GET`    | `/tournaments`               | List World Cup editions.                                  |
| `GET`    | `/tournaments/:slug`         | Get one tournament.                                       |
| `GET`    | `/tournaments/:slug/teams`   | List teams in a tournament.                               |
| `GET`    | `/tournaments/:slug/matches` | List a tournament's matches.                              |
| `GET`    | `/teams`                     | List national teams.                                      |
| `GET`    | `/teams/:slug`               | Get one team.                                             |
| `GET`    | `/teams/:slug/matches`       | List a team's matches.                                    |
| `GET`    | `/players`                   | List players with their team.                             |
| `GET`    | `/players/:slug`             | Get one player.                                           |
| `GET`    | `/players/:slug/matches`     | List a player's appearances, including `starter`.         |
| `GET`    | `/players/:slug/goals`       | List a player's goals with basic match information.       |
| `GET`    | `/matches`                   | List match summaries.                                     |
| `GET`    | `/matches/:slug`             | Get a match, lineups, goals, substitutions, and bookings. |
| `GET`    | `/matches/:slug/players`     | Get grouped home/away starting XI and bench players.      |
| `GET`    | `/matches/:slug/goals`       | Get grouped chronological home/away goals.                |
| `GET`    | `/stadiums`                  | List stadiums.                                            |
| `GET`    | `/stadiums/:slug`            | Get one stadium.                                          |
| `GET`    | `/stadiums/:slug/matches`    | List matches played at a stadium.                         |

Football responses expose `slug` rather than internal UUID `id` values, including nested tournament, team, stadium, player, and match references. UUIDs remain the database primary and foreign keys. Unknown public identifiers return `404`; UUID routes are not supported.

### Pagination

Every collection route uses `page` and `limit` query parameters:

```text
GET /matches?page=2&limit=50
```

- Defaults: `page=1`, `limit=20`
- Maximum `limit`: `100` (values above it are clamped)
- Non-numeric or non-positive values return `400`

Collections return:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

### Rate limiting

The application uses in-memory IP-based rate limiting: 100 requests per 60 seconds. It applies globally, including failed authentication requests. Configure `TRUST_PROXY` only when running behind a trusted reverse proxy.

## Database schema

The initial TypeORM migration creates the following PostgreSQL tables. UUIDs are generated for internal primary and foreign keys; football tables also store a unique public `slug`. Foreign keys use `ON DELETE RESTRICT` to preserve historical records.

| Table              | Purpose                                  | Key relationships / constraints                                                                                                                                           |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`            | Registered API users.                    | Unique `email`.                                                                                                                                                           |
| `api_keys`         | Hashed API keys belonging to users.      | `user_id -> users`; unique nullable SHA-256 `key_fingerprint`; active flag.                                                                                               |
| `tournaments`      | One World Cup edition.                   | Unique `(name, year)` and `slug`; includes `host`, `start_date`, `end_date`.                                                                                              |
| `teams`            | National teams across editions.          | Unique `name`, `slug`, and nullable `code`.                                                                                                                               |
| `tournament_teams` | Tournament/team membership.              | `tournament_id -> tournaments`, `team_id -> teams`; unique tournament/team pair; optional group name.                                                                     |
| `players`          | Players representing a national team.    | `team_id -> teams`; unique `(team_id, name)` and `slug`.                                                                                                                  |
| `stadiums`         | Source-provided stadium and city string. | Unique `ground` and `slug`.                                                                                                                                               |
| `matches`          | Tournament fixtures and results.         | Unique `slug`; tournament, optional stadium, home team, away team; unique tournament/date/team pairing; different-team check; regulation, extra-time, and penalty scores. |
| `match_players`    | Starting XI and bench selections.        | Match, player, and team references; unique `(match_id, player_id)`; includes captain flag.                                                                                |
| `goals`            | Goals credited to a team.                | Match, player, and credited team references; minute, added time, penalty, and own-goal fields.                                                                            |
| `bookings`         | Yellow, second-yellow, and red cards.    | Match, player, and team references; `card_type_enum`; minute and added time.                                                                                              |
| `substitutions`    | Player changes during a match.           | Match, team, player-out, and player-in references; minute and added time.                                                                                                 |

The importer preserves source semantics for own goals: the goal's team is the credited side, while the scorer belongs to the opposing team.

## Development commands

```bash
# Format TypeScript and tests
npm run format

# Lint source and tests
npm run lint

# Unit tests
npm test

# End-to-end tests
npm run test:e2e

# Build
npm run build

# Inspect migration status
npm run migration:show

# Revert the most recently applied migration
npm run migration:revert
```

## Project structure

```text
src/
  auth/          User registration and JWT login
  api-keys/      API-key generation, deactivation, and guard
  football/      Read-only football feature modules and entities
  common/        Shared pagination utilities
  config/        Rate-limit and proxy configuration
  database/      TypeORM data source and migrations
scripts/         Standalone World Cup import tools
test/            End-to-end and importer tests
```
