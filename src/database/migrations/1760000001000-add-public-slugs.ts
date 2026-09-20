import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  makeUniqueSlug,
  matchSlug,
  playerSlug,
  slugify,
  tournamentSlug,
} from '../../common/slugs/slug-utils.js';

type NamedRow = { id: string; name: string };
type TournamentRow = NamedRow & { year: number };
type PlayerRow = NamedRow & { team_slug: string };
type MatchRow = {
  id: string;
  year: number;
  home_team_slug: string;
  away_team_slug: string;
  round: string;
  match_date: string;
  kickoff_time: string | null;
};

export class AddPublicSlugs1760000001000 implements MigrationInterface {
  name = 'AddPublicSlugs1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'tournaments',
      'teams',
      'players',
      'stadiums',
      'matches',
    ]) {
      await queryRunner.query(`ALTER TABLE ${table} ADD COLUMN slug VARCHAR`);
    }

    await this.backfillTournaments(queryRunner);
    await this.backfillTeams(queryRunner);
    await this.backfillStadiums(queryRunner);
    await this.backfillPlayers(queryRunner);
    await this.backfillMatches(queryRunner);

    for (const [table, constraint] of [
      ['tournaments', 'UQ_tournaments_slug'],
      ['teams', 'UQ_teams_slug'],
      ['players', 'UQ_players_slug'],
      ['stadiums', 'UQ_stadiums_slug'],
      ['matches', 'UQ_matches_slug'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE ${table} ALTER COLUMN slug SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT ${constraint} UNIQUE (slug)`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, constraint] of [
      ['matches', 'UQ_matches_slug'],
      ['stadiums', 'UQ_stadiums_slug'],
      ['players', 'UQ_players_slug'],
      ['teams', 'UQ_teams_slug'],
      ['tournaments', 'UQ_tournaments_slug'],
    ]) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT ${constraint}`,
      );
      await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN slug`);
    }
  }

  private async backfillTournaments(queryRunner: QueryRunner): Promise<void> {
    const tournaments = (await queryRunner.query(`
      SELECT id, name, year
      FROM tournaments
      ORDER BY year ASC, LOWER(name) ASC, name ASC
    `)) as TournamentRow[];
    const usedSlugs = new Set<string>();

    for (const tournament of tournaments) {
      const slug = makeUniqueSlug(
        tournamentSlug(tournament.name, tournament.year),
        usedSlugs,
      );
      await queryRunner.query(
        'UPDATE tournaments SET slug = $1 WHERE id = $2',
        [slug, tournament.id],
      );
    }
  }

  private async backfillTeams(queryRunner: QueryRunner): Promise<void> {
    const teams = (await queryRunner.query(`
      SELECT id, name
      FROM teams
      ORDER BY LOWER(name) ASC, name ASC
    `)) as NamedRow[];
    const usedSlugs = new Set<string>();

    for (const team of teams) {
      await queryRunner.query('UPDATE teams SET slug = $1 WHERE id = $2', [
        makeUniqueSlug(slugify(team.name), usedSlugs),
        team.id,
      ]);
    }
  }

  private async backfillStadiums(queryRunner: QueryRunner): Promise<void> {
    const stadiums = (await queryRunner.query(`
      SELECT id, ground AS name
      FROM stadiums
      ORDER BY LOWER(ground) ASC, ground ASC
    `)) as NamedRow[];
    const usedSlugs = new Set<string>();

    for (const stadium of stadiums) {
      await queryRunner.query('UPDATE stadiums SET slug = $1 WHERE id = $2', [
        makeUniqueSlug(slugify(stadium.name), usedSlugs),
        stadium.id,
      ]);
    }
  }

  private async backfillPlayers(queryRunner: QueryRunner): Promise<void> {
    const players = (await queryRunner.query(`
      SELECT player.id, player.name, team.slug AS team_slug
      FROM players player
      INNER JOIN teams team ON team.id = player.team_id
      ORDER BY LOWER(player.name) ASC, player.name ASC, team.slug ASC
    `)) as PlayerRow[];
    const usedSlugs = new Set<string>();

    for (const player of players) {
      await queryRunner.query('UPDATE players SET slug = $1 WHERE id = $2', [
        playerSlug(player.name, player.team_slug, usedSlugs),
        player.id,
      ]);
    }
  }

  private async backfillMatches(queryRunner: QueryRunner): Promise<void> {
    const matches = (await queryRunner.query(`
      SELECT
        match.id,
        tournament.year,
        home_team.slug AS home_team_slug,
        away_team.slug AS away_team_slug,
        match.round,
        match.match_date,
        match.kickoff_time
      FROM matches match
      INNER JOIN tournaments tournament ON tournament.id = match.tournament_id
      INNER JOIN teams home_team ON home_team.id = match.home_team_id
      INNER JOIN teams away_team ON away_team.id = match.away_team_id
      ORDER BY
        tournament.year ASC,
        match.match_date ASC,
        match.kickoff_time ASC NULLS FIRST,
        home_team.slug ASC,
        away_team.slug ASC,
        match.round ASC
    `)) as MatchRow[];
    const usedSlugs = new Set<string>();

    for (const match of matches) {
      await queryRunner.query('UPDATE matches SET slug = $1 WHERE id = $2', [
        matchSlug(
          {
            year: match.year,
            homeTeamSlug: match.home_team_slug,
            awayTeamSlug: match.away_team_slug,
            round: match.round,
            matchDate: match.match_date,
            kickoffTime: match.kickoff_time,
          },
          usedSlugs,
        ),
        match.id,
      ]);
    }
  }
}
