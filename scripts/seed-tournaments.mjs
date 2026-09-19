import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

export const tournamentSources = [
  {
    name: 'FIFA World Cup',
    year: 1930,
    host: 'Uruguay',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1930/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1934,
    host: 'Italy',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1934/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1938,
    host: 'France',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1938/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1950,
    host: 'Brazil',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1950/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1954,
    host: 'Switzerland',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1954/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1958,
    host: 'Sweden',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1958/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1962,
    host: 'Chile',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1962/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1966,
    host: 'England',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1966/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1970,
    host: 'Mexico',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1970/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1974,
    host: 'West Germany',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1974/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1978,
    host: 'Argentina',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1978/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1982,
    host: 'Spain',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1982/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1986,
    host: 'Mexico',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1986/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1990,
    host: 'Italy',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1990/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1994,
    host: 'United States',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1994/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 1998,
    host: 'France',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/1998/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2002,
    host: 'South Korea, Japan',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2002/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2006,
    host: 'Germany',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2006/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2010,
    host: 'South Africa',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2010/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2014,
    host: 'Brazil',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2014/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2018,
    host: 'Russia',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2018/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2022,
    host: 'Qatar',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2022/worldcup-full.json',
  },
  {
    name: 'FIFA World Cup',
    year: 2026,
    host: 'Canada, United States, Mexico',
    url: 'https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup-full.json',
  },
];

const tournamentUpsertQuery = `
  INSERT INTO tournaments (id, name, year, host, start_date, end_date)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (name, year) DO UPDATE
  SET
    host = EXCLUDED.host,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date
  RETURNING id, name, year, host, start_date, end_date
`;

function getRequiredEnvironmentVariable(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }

  return value;
}

function getDatabaseConfig() {
  const port = Number(process.env.DB_PORT ?? 5432);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid port number');
  }

  return {
    host: getRequiredEnvironmentVariable('DB_HOST'),
    port,
    user: getRequiredEnvironmentVariable('DB_USERNAME'),
    password: getRequiredEnvironmentVariable('DB_PASSWORD'),
    database: getRequiredEnvironmentVariable('DB_NAME'),
  };
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function getTournamentDates(source) {
  if (!source || typeof source !== 'object' || !Array.isArray(source.matches)) {
    throw new Error('Tournament source must include a matches array');
  }

  if (source.matches.length === 0) {
    throw new Error('Tournament source must include at least one match');
  }

  // Match dates are the source of truth for the tournament's date range.
  const dates = source.matches.map((match, index) => {
    if (!match || typeof match !== 'object' || !isIsoDate(match.date)) {
      throw new Error(`Match at index ${index} must include a valid ISO date`);
    }

    return match.date;
  });

  return {
    start_date: dates.reduce((earliest, date) =>
      date < earliest ? date : earliest,
    ),
    end_date: dates.reduce((latest, date) => (date > latest ? date : latest)),
  };
}

export function createTournamentUpsert(tournament, id = randomUUID()) {
  return {
    text: tournamentUpsertQuery,
    values: [
      id,
      tournament.name,
      tournament.year,
      tournament.host,
      tournament.start_date,
      tournament.end_date,
    ],
  };
}

async function fetchTournamentSource(tournamentSource, fetchImplementation) {
  const response = await fetchImplementation(tournamentSource.url);

  if (!response.ok) {
    throw new Error(
      `Unable to fetch ${tournamentSource.url}: ${response.status} ${response.statusText}`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Unable to parse JSON from ${tournamentSource.url}`);
  }
}

export async function seedTournaments({
  client = new Client(getDatabaseConfig()),
  fetchImplementation = fetch,
  sources = tournamentSources,
  logger = console,
} = {}) {
  try {
    await client.connect();
    const seededTournaments = [];

    for (const tournamentSource of sources) {
      const source = await fetchTournamentSource(
        tournamentSource,
        fetchImplementation,
      );
      const dates = getTournamentDates(source);
      const tournament = { ...tournamentSource, ...dates };
      const result = await client.query(createTournamentUpsert(tournament));
      const seededTournament = result.rows[0];

      seededTournaments.push(seededTournament);
      logger.log(
        `Seeded ${seededTournament.name} ${seededTournament.year} (${seededTournament.id})`,
      );
    }

    return seededTournaments;
  } finally {
    await client.end();
  }
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMainModule) {
  seedTournaments().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
