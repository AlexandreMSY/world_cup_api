import 'dotenv/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { tournamentSources } from './tournament-sources.mjs';

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

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value;
}

function getOptionalArray(value, label) {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array when provided`);
  }

  return value;
}

function parseScorePair(value, label) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((score) => !Number.isInteger(score) || score < 0)
  ) {
    throw new Error(`${label} must contain two non-negative integers`);
  }

  return value;
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function normalizePlayerName(value) {
  return requireString(value, 'Player name').trim().replace(/\s+/g, ' ');
}

function playerLookupKey(value) {
  return normalizePlayerName(value).toLocaleLowerCase('en-US');
}

export function parseMinute(value) {
  if (value === undefined || value === null) {
    return { minute: null, added_time: null };
  }

  const normalizedValue = String(value);
  const match = /^(\d+)(?:\+(\d+))?$/.exec(normalizedValue);

  if (!match) {
    throw new Error(`Invalid match minute: ${normalizedValue}`);
  }

  return {
    minute: Number(match[1]),
    added_time: match[2] === undefined ? null : Number(match[2]),
  };
}

export function parseKickoffTime(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error('Kickoff time must be a string when provided');
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)(?:\s+UTC(?:[+-]\d{1,2})?)?$/.exec(
    value,
  );

  if (!match) {
    throw new Error(`Invalid kickoff time: ${value}`);
  }

  return `${match[1]}:${match[2]}`;
}

export function deriveCardTypes(cards) {
  const yellowCards = new Set();

  return cards.map((card) => {
    const name = normalizePlayerName(card.name);
    const key = playerLookupKey(name);

    if (card.type === 'Y') {
      yellowCards.add(key);
      return 'yellow';
    }

    if (card.type === 'R') {
      if (yellowCards.has(key)) {
        yellowCards.delete(key);
        return 'second_yellow';
      }

      return 'red';
    }

    throw new Error(`Unsupported card type: ${String(card.type)}`);
  });
}

function parseGoal(goal, label) {
  if (!goal || typeof goal !== 'object') {
    throw new Error(`${label} must be an object`);
  }

  return {
    name: normalizePlayerName(goal.name),
    ...parseMinute(goal.minute),
    penalty: goal.penalty === true,
    own_goal: goal.owngoal === true,
  };
}

function parseBooking(card, cardType, label) {
  if (!card || typeof card !== 'object') {
    throw new Error(`${label} must be an object`);
  }

  return {
    name: normalizePlayerName(card.name),
    card_type: cardType,
    ...parseMinute(card.minute),
  };
}

function parseLineupPlayer(player, starter, label) {
  if (!player || typeof player !== 'object') {
    throw new Error(`${label} must be an object`);
  }

  return {
    name: normalizePlayerName(player.name),
    starter,
    captain: player.captain === true,
  };
}

function parseSubstitution(substitution, label) {
  if (!substitution || typeof substitution !== 'object') {
    throw new Error(`${label} must be an object`);
  }

  return {
    player_in: normalizePlayerName(substitution.on),
    player_out: normalizePlayerName(substitution.off),
    ...parseMinute(substitution.minute),
  };
}

function parseLineupSide(side, label) {
  if (side === undefined) {
    return { players: [], substitutions: [] };
  }

  if (!side || typeof side !== 'object' || Array.isArray(side)) {
    throw new Error(`${label} must be an object`);
  }

  const starters = getOptionalArray(side.starter, `${label}.starter`).map(
    (player, index) =>
      parseLineupPlayer(player, true, `${label}.starter[${index}]`),
  );
  const bench = getOptionalArray(side.bench, `${label}.bench`).map(
    (player, index) =>
      parseLineupPlayer(player, false, `${label}.bench[${index}]`),
  );
  const substitutions = getOptionalArray(side.subs, `${label}.subs`).map(
    (substitution, index) =>
      parseSubstitution(substitution, `${label}.subs[${index}]`),
  );

  return { players: [...starters, ...bench], substitutions };
}

function countRegulationGoals(goals, label) {
  return goals.reduce((score, goal) => {
    if (goal.minute === null) {
      throw new Error(
        `${label} cannot derive a score from a goal without a minute`,
      );
    }

    return score + (goal.minute <= 90 ? 1 : 0);
  }, 0);
}

export function parseMatchScore(score, homeGoals = [], awayGoals = []) {
  const emptyScore = {
    home_score: null,
    away_score: null,
    home_score_et: null,
    away_score_et: null,
    home_score_penalties: null,
    away_score_penalties: null,
  };

  if (score === undefined || score === null) {
    return emptyScore;
  }

  if (Array.isArray(score)) {
    const [homeScore, awayScore] = parseScorePair(score, 'score');

    return { ...emptyScore, home_score: homeScore, away_score: awayScore };
  }

  if (typeof score !== 'object') {
    throw new Error('score must be an array or object');
  }

  const fullTime =
    score.ft === undefined ? null : parseScorePair(score.ft, 'score.ft');
  const extraTime =
    score.et === undefined ? null : parseScorePair(score.et, 'score.et');
  const penalties =
    score.p === undefined ? null : parseScorePair(score.p, 'score.p');

  if (!fullTime && !extraTime && !penalties) {
    throw new Error('score object must include ft, et, or p');
  }

  let regulationScore = fullTime;

  // Legacy knockout files can omit ft, so credited goal events are the only safe regulation-score source.
  if (!regulationScore && extraTime) {
    regulationScore = [
      countRegulationGoals(homeGoals, 'home goals'),
      countRegulationGoals(awayGoals, 'away goals'),
    ];

    const totalHomeGoals = homeGoals.length;
    const totalAwayGoals = awayGoals.length;

    if (totalHomeGoals !== extraTime[0] || totalAwayGoals !== extraTime[1]) {
      throw new Error('Goal events do not match the supplied extra-time score');
    }
  }

  return {
    home_score: regulationScore?.[0] ?? null,
    away_score: regulationScore?.[1] ?? null,
    home_score_et: extraTime?.[0] ?? null,
    away_score_et: extraTime?.[1] ?? null,
    home_score_penalties: penalties?.[0] ?? null,
    away_score_penalties: penalties?.[1] ?? null,
  };
}

function parseMatch(sourceMatch, index) {
  if (
    !sourceMatch ||
    typeof sourceMatch !== 'object' ||
    Array.isArray(sourceMatch)
  ) {
    throw new Error(`Match at index ${index} must be an object`);
  }

  if (!isIsoDate(sourceMatch.date)) {
    throw new Error(`Match at index ${index} must include a valid ISO date`);
  }

  const homeTeam = requireString(sourceMatch.team1, `matches[${index}].team1`);
  const awayTeam = requireString(sourceMatch.team2, `matches[${index}].team2`);

  if (homeTeam === awayTeam) {
    throw new Error(`Match at index ${index} cannot use the same team twice`);
  }

  const goals = [
    getOptionalArray(sourceMatch.goals1, `matches[${index}].goals1`).map(
      (goal, goalIndex) =>
        parseGoal(goal, `matches[${index}].goals1[${goalIndex}]`),
    ),
    getOptionalArray(sourceMatch.goals2, `matches[${index}].goals2`).map(
      (goal, goalIndex) =>
        parseGoal(goal, `matches[${index}].goals2[${goalIndex}]`),
    ),
  ];
  const rawBookings = getOptionalArray(
    sourceMatch.bookings,
    `matches[${index}].bookings`,
  );
  const bookings = [0, 1].map((sideIndex) => {
    const cards = getOptionalArray(
      rawBookings[sideIndex],
      `matches[${index}].bookings[${sideIndex}]`,
    );
    const cardTypes = deriveCardTypes(cards);

    return cards.map((card, cardIndex) =>
      parseBooking(
        card,
        cardTypes[cardIndex],
        `matches[${index}].bookings[${sideIndex}][${cardIndex}]`,
      ),
    );
  });
  const rawLineup = getOptionalArray(
    sourceMatch.lineup,
    `matches[${index}].lineup`,
  );
  const lineup = [0, 1].map((sideIndex) =>
    parseLineupSide(
      rawLineup[sideIndex],
      `matches[${index}].lineup[${sideIndex}]`,
    ),
  );

  return {
    round: requireString(sourceMatch.round, `matches[${index}].round`),
    match_date: sourceMatch.date,
    kickoff_time: parseKickoffTime(sourceMatch.time),
    home_team: homeTeam,
    away_team: awayTeam,
    ground:
      sourceMatch.ground === undefined
        ? null
        : requireString(sourceMatch.ground, `matches[${index}].ground`),
    ...parseMatchScore(sourceMatch.score, goals[0], goals[1]),
    goals,
    bookings,
    lineup,
  };
}

export function parseTournamentSource(source) {
  if (!source || typeof source !== 'object' || !Array.isArray(source.matches)) {
    throw new Error('Tournament source must include a matches array');
  }

  if (source.matches.length === 0) {
    throw new Error('Tournament source must include at least one match');
  }

  const matches = source.matches.map(parseMatch);
  const dates = matches.map((match) => match.match_date);

  return {
    matches,
    start_date: dates.reduce((earliest, date) =>
      date < earliest ? date : earliest,
    ),
    end_date: dates.reduce((latest, date) => (date > latest ? date : latest)),
  };
}

export function getGroupName(round) {
  return /\bGroup\s+([A-Za-z0-9]+)\s*$/i.exec(round)?.[1] ?? null;
}

export function resolveGoalPlayerTeam(sideIndex, ownGoal) {
  return ownGoal ? 1 - sideIndex : sideIndex;
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

async function queryOne(client, text, values) {
  const result = await client.query(text, values);

  if (!result.rows[0]) {
    throw new Error('Database query did not return the expected row');
  }

  return result.rows[0];
}

async function upsertTournament(client, source, parsedSource) {
  return await queryOne(
    client,
    `
      INSERT INTO tournaments (name, year, host, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name, year) DO UPDATE SET
        host = EXCLUDED.host,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date
      RETURNING id
    `,
    [
      source.name,
      source.year,
      source.host,
      parsedSource.start_date,
      parsedSource.end_date,
    ],
  );
}

async function upsertTeam(client, name) {
  return await queryOne(
    client,
    `
      INSERT INTO teams (name, code)
      VALUES ($1, NULL)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `,
    [name],
  );
}

async function upsertStadium(client, ground) {
  return await queryOne(
    client,
    `
      INSERT INTO stadiums (ground)
      VALUES ($1)
      ON CONFLICT (ground) DO UPDATE SET ground = EXCLUDED.ground
      RETURNING id
    `,
    [ground],
  );
}

async function findOrCreatePlayer(client, teamId, name) {
  const lookupName = playerLookupKey(name);
  const existingPlayer = await client.query(
    `
      SELECT id, name
      FROM players
      WHERE team_id = $1
        AND LOWER(REGEXP_REPLACE(BTRIM(name), '\\s+', ' ', 'g')) = $2
      LIMIT 1
    `,
    [teamId, lookupName],
  );

  if (existingPlayer.rows[0]) {
    return existingPlayer.rows[0];
  }

  return await queryOne(
    client,
    'INSERT INTO players (team_id, name) VALUES ($1, $2) RETURNING id, name',
    [teamId, normalizePlayerName(name)],
  );
}

async function upsertMatch(client, tournamentId, stadiumId, teamIds, match) {
  return await queryOne(
    client,
    `
      INSERT INTO matches (
        tournament_id, stadium_id, home_team_id, away_team_id, round,
        match_date, kickoff_time, home_score, away_score, home_score_et,
        away_score_et, home_score_penalties, away_score_penalties
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (tournament_id, match_date, home_team_id, away_team_id)
      DO UPDATE SET
        stadium_id = EXCLUDED.stadium_id,
        round = EXCLUDED.round,
        kickoff_time = EXCLUDED.kickoff_time,
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        home_score_et = EXCLUDED.home_score_et,
        away_score_et = EXCLUDED.away_score_et,
        home_score_penalties = EXCLUDED.home_score_penalties,
        away_score_penalties = EXCLUDED.away_score_penalties
      RETURNING id
    `,
    [
      tournamentId,
      stadiumId,
      teamIds[0],
      teamIds[1],
      match.round,
      match.match_date,
      match.kickoff_time,
      match.home_score,
      match.away_score,
      match.home_score_et,
      match.away_score_et,
      match.home_score_penalties,
      match.away_score_penalties,
    ],
  );
}

async function upsertTournamentTeam(client, tournamentId, teamId, groupName) {
  await client.query(
    `
      INSERT INTO tournament_teams (tournament_id, team_id, group_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (tournament_id, team_id) DO UPDATE SET
        group_name = COALESCE(EXCLUDED.group_name, tournament_teams.group_name)
    `,
    [tournamentId, teamId, groupName],
  );
}

async function clearMatchDetails(client, matchId) {
  await client.query('DELETE FROM substitutions WHERE match_id = $1', [
    matchId,
  ]);
  await client.query('DELETE FROM bookings WHERE match_id = $1', [matchId]);
  await client.query('DELETE FROM goals WHERE match_id = $1', [matchId]);
  await client.query('DELETE FROM match_players WHERE match_id = $1', [
    matchId,
  ]);
}

async function importTournament(client, tournamentSource, parsedSource) {
  const tournament = await upsertTournament(
    client,
    tournamentSource,
    parsedSource,
  );
  const teamCache = new Map();
  const stadiumCache = new Map();
  const playerCache = new Map();
  const importedPlayerIds = new Set();
  const counts = {
    matches: 0,
    teams: 0,
    players: 0,
    goals: 0,
    bookings: 0,
    substitutions: 0,
  };

  const ensureTeam = async (name) => {
    if (!teamCache.has(name)) {
      const team = await upsertTeam(client, name);
      teamCache.set(name, team);
      counts.teams += 1;
    }

    return teamCache.get(name);
  };

  const ensurePlayer = async (teamId, name) => {
    const key = `${teamId}:${playerLookupKey(name)}`;

    if (!playerCache.has(key)) {
      const player = await findOrCreatePlayer(client, teamId, name);
      playerCache.set(key, player);

      if (!importedPlayerIds.has(player.id)) {
        importedPlayerIds.add(player.id);
        counts.players += 1;
      }
    }

    return playerCache.get(key);
  };

  for (const match of parsedSource.matches) {
    const teams = [
      await ensureTeam(match.home_team),
      await ensureTeam(match.away_team),
    ];
    const teamIds = teams.map((team) => team.id);
    let stadiumId = null;

    if (match.ground) {
      if (!stadiumCache.has(match.ground)) {
        stadiumCache.set(
          match.ground,
          await upsertStadium(client, match.ground),
        );
      }

      stadiumId = stadiumCache.get(match.ground).id;
    }

    const databaseMatch = await upsertMatch(
      client,
      tournament.id,
      stadiumId,
      teamIds,
      match,
    );
    const groupName = getGroupName(match.round);

    await upsertTournamentTeam(client, tournament.id, teamIds[0], groupName);
    await upsertTournamentTeam(client, tournament.id, teamIds[1], groupName);
    await clearMatchDetails(client, databaseMatch.id);

    for (const sideIndex of [0, 1]) {
      const teamId = teamIds[sideIndex];
      const lineup = match.lineup[sideIndex];

      for (const selectedPlayer of lineup.players) {
        const player = await ensurePlayer(teamId, selectedPlayer.name);

        await client.query(
          `
            INSERT INTO match_players (
              match_id, player_id, team_id, starter, position, shirt_number, captain
            )
            VALUES ($1, $2, $3, $4, NULL, NULL, $5)
            ON CONFLICT (match_id, player_id) DO UPDATE SET
              team_id = EXCLUDED.team_id,
              starter = EXCLUDED.starter,
              captain = EXCLUDED.captain
          `,
          [
            databaseMatch.id,
            player.id,
            teamId,
            selectedPlayer.starter,
            selectedPlayer.captain,
          ],
        );
      }

      for (const goal of match.goals[sideIndex]) {
        // Goals are grouped by credited side, but an own-goal scorer belongs to the opponent.
        const playerTeamId =
          teamIds[resolveGoalPlayerTeam(sideIndex, goal.own_goal)];
        const player = await ensurePlayer(playerTeamId, goal.name);

        await client.query(
          `
            INSERT INTO goals (
              match_id, player_id, team_id, minute, added_time, penalty, own_goal
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            databaseMatch.id,
            player.id,
            teamId,
            goal.minute,
            goal.added_time,
            goal.penalty,
            goal.own_goal,
          ],
        );
        counts.goals += 1;
      }

      for (const booking of match.bookings[sideIndex]) {
        const player = await ensurePlayer(teamId, booking.name);

        await client.query(
          `
            INSERT INTO bookings (
              match_id, player_id, team_id, card_type, minute, added_time
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            databaseMatch.id,
            player.id,
            teamId,
            booking.card_type,
            booking.minute,
            booking.added_time,
          ],
        );
        counts.bookings += 1;
      }

      for (const substitution of lineup.substitutions) {
        const playerOut = await ensurePlayer(teamId, substitution.player_out);
        const playerIn = await ensurePlayer(teamId, substitution.player_in);

        await client.query(
          `
            INSERT INTO substitutions (
              match_id, team_id, player_out_id, player_in_id, minute, added_time
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [
            databaseMatch.id,
            teamId,
            playerOut.id,
            playerIn.id,
            substitution.minute,
            substitution.added_time,
          ],
        );
        counts.substitutions += 1;
      }
    }

    counts.matches += 1;
  }

  return counts;
}

export function selectTournamentSources(yearArgument) {
  if (yearArgument === undefined) {
    return tournamentSources;
  }

  if (!/^\d{4}$/.test(yearArgument)) {
    throw new Error('Tournament year must be a four-digit year');
  }

  const year = Number(yearArgument);
  const source = tournamentSources.find((candidate) => candidate.year === year);

  if (!source) {
    throw new Error(`No tournament source is configured for ${year}`);
  }

  return [source];
}

export async function seedTournaments({
  client = new Client(getDatabaseConfig()),
  fetchImplementation = fetch,
  sources = tournamentSources,
  logger = console,
  importTournamentImplementation = importTournament,
} = {}) {
  const failures = [];

  try {
    await client.connect();

    for (const tournamentSource of sources) {
      let transactionStarted = false;

      try {
        const source = await fetchTournamentSource(
          tournamentSource,
          fetchImplementation,
        );
        const parsedSource = parseTournamentSource(source);

        await client.query('BEGIN');
        transactionStarted = true;
        const counts = await importTournamentImplementation(
          client,
          tournamentSource,
          parsedSource,
        );
        await client.query('COMMIT');
        transactionStarted = false;
        logger.log(
          `Imported ${tournamentSource.year}: ${counts.matches} matches, ${counts.teams} teams, ${counts.players} players, ${counts.goals} goals, ${counts.bookings} bookings, ${counts.substitutions} substitutions`,
        );
      } catch (error) {
        if (transactionStarted) {
          await client.query('ROLLBACK');
        }

        const message = error instanceof Error ? error.message : String(error);
        failures.push({ year: tournamentSource.year, message });
        logger.error(`Failed ${tournamentSource.year}: ${message}`);
      }
    }
  } finally {
    await client.end();
  }

  if (failures.length > 0) {
    throw new Error(`${failures.length} tournament import(s) failed`);
  }
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMainModule) {
  let sources;

  try {
    sources = selectTournamentSources(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }

  if (sources) {
    seedTournaments({ sources }).catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}
