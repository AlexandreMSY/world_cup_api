import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      "CREATE TYPE card_type_enum AS ENUM ('yellow', 'second_yellow', 'red')",
    );
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE api_keys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        key_hash VARCHAR NOT NULL,
        key_fingerprint VARCHAR(64) UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        active BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT FK_api_keys_user_id FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_api_keys_user_id ON api_keys(user_id)',
    );
    await queryRunner.query(`
      CREATE TABLE tournaments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        host VARCHAR(100),
        start_date DATE,
        end_date DATE,
        CONSTRAINT UQ_tournaments_name_year UNIQUE (name, year)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE teams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR NOT NULL UNIQUE,
        code VARCHAR UNIQUE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE tournament_teams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id UUID NOT NULL,
        team_id UUID NOT NULL,
        group_name VARCHAR,
        CONSTRAINT UQ_tournament_teams_tournament_team
          UNIQUE (tournament_id, team_id),
        CONSTRAINT FK_tournament_teams_tournament_id FOREIGN KEY (tournament_id)
          REFERENCES tournaments(id) ON DELETE RESTRICT,
        CONSTRAINT FK_tournament_teams_team_id FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_tournament_teams_team_id ON tournament_teams(team_id)',
    );
    await queryRunner.query(`
      CREATE TABLE players (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        team_id UUID NOT NULL,
        name VARCHAR NOT NULL,
        CONSTRAINT UQ_players_team_name UNIQUE (team_id, name),
        CONSTRAINT FK_players_team_id FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE stadiums (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        ground VARCHAR NOT NULL UNIQUE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE matches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tournament_id UUID NOT NULL,
        stadium_id UUID,
        home_team_id UUID NOT NULL,
        away_team_id UUID NOT NULL,
        round VARCHAR NOT NULL,
        match_date DATE NOT NULL,
        kickoff_time TIME,
        home_score INTEGER,
        away_score INTEGER,
        home_score_et INTEGER,
        away_score_et INTEGER,
        home_score_penalties INTEGER,
        away_score_penalties INTEGER,
        CONSTRAINT UQ_matches_tournament_date_teams
          UNIQUE (tournament_id, match_date, home_team_id, away_team_id),
        CONSTRAINT CHK_matches_different_teams CHECK (home_team_id <> away_team_id),
        CONSTRAINT FK_matches_tournament_id FOREIGN KEY (tournament_id)
          REFERENCES tournaments(id) ON DELETE RESTRICT,
        CONSTRAINT FK_matches_stadium_id FOREIGN KEY (stadium_id)
          REFERENCES stadiums(id) ON DELETE RESTRICT,
        CONSTRAINT FK_matches_home_team_id FOREIGN KEY (home_team_id)
          REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT FK_matches_away_team_id FOREIGN KEY (away_team_id)
          REFERENCES teams(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_matches_home_team_id ON matches(home_team_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_matches_away_team_id ON matches(away_team_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_matches_stadium_id ON matches(stadium_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_matches_match_date ON matches(match_date)',
    );
    await queryRunner.query(`
      CREATE TABLE match_players (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID NOT NULL,
        player_id UUID NOT NULL,
        team_id UUID NOT NULL,
        starter BOOLEAN NOT NULL,
        position VARCHAR,
        shirt_number INTEGER,
        captain BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT UQ_match_players_match_player UNIQUE (match_id, player_id),
        CONSTRAINT FK_match_players_match_id FOREIGN KEY (match_id)
          REFERENCES matches(id) ON DELETE RESTRICT,
        CONSTRAINT FK_match_players_player_id FOREIGN KEY (player_id)
          REFERENCES players(id) ON DELETE RESTRICT,
        CONSTRAINT FK_match_players_team_id FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_match_players_player_id ON match_players(player_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_match_players_team_id ON match_players(team_id)',
    );
    await queryRunner.query(`
      CREATE TABLE goals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID NOT NULL,
        player_id UUID NOT NULL,
        team_id UUID NOT NULL,
        minute INTEGER,
        added_time INTEGER,
        penalty BOOLEAN NOT NULL DEFAULT false,
        own_goal BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT FK_goals_match_id FOREIGN KEY (match_id)
          REFERENCES matches(id) ON DELETE RESTRICT,
        CONSTRAINT FK_goals_player_id FOREIGN KEY (player_id)
          REFERENCES players(id) ON DELETE RESTRICT,
        CONSTRAINT FK_goals_team_id FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_goals_match_id ON goals(match_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_goals_player_id ON goals(player_id)',
    );
    await queryRunner.query('CREATE INDEX IDX_goals_team_id ON goals(team_id)');
    await queryRunner.query(`
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID NOT NULL,
        player_id UUID NOT NULL,
        team_id UUID NOT NULL,
        card_type card_type_enum NOT NULL,
        minute INTEGER,
        added_time INTEGER,
        CONSTRAINT FK_bookings_match_id FOREIGN KEY (match_id)
          REFERENCES matches(id) ON DELETE RESTRICT,
        CONSTRAINT FK_bookings_player_id FOREIGN KEY (player_id)
          REFERENCES players(id) ON DELETE RESTRICT,
        CONSTRAINT FK_bookings_team_id FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_bookings_match_id ON bookings(match_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_bookings_player_id ON bookings(player_id)',
    );
    await queryRunner.query(`
      CREATE TABLE substitutions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID NOT NULL,
        team_id UUID NOT NULL,
        player_out_id UUID NOT NULL,
        player_in_id UUID NOT NULL,
        minute INTEGER,
        added_time INTEGER,
        CONSTRAINT FK_substitutions_match_id FOREIGN KEY (match_id)
          REFERENCES matches(id) ON DELETE RESTRICT,
        CONSTRAINT FK_substitutions_team_id FOREIGN KEY (team_id)
          REFERENCES teams(id) ON DELETE RESTRICT,
        CONSTRAINT FK_substitutions_player_out_id FOREIGN KEY (player_out_id)
          REFERENCES players(id) ON DELETE RESTRICT,
        CONSTRAINT FK_substitutions_player_in_id FOREIGN KEY (player_in_id)
          REFERENCES players(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IDX_substitutions_match_id ON substitutions(match_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_substitutions_player_out_id ON substitutions(player_out_id)',
    );
    await queryRunner.query(
      'CREATE INDEX IDX_substitutions_player_in_id ON substitutions(player_in_id)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE substitutions');
    await queryRunner.query('DROP TABLE bookings');
    await queryRunner.query('DROP TABLE goals');
    await queryRunner.query('DROP TABLE match_players');
    await queryRunner.query('DROP TABLE matches');
    await queryRunner.query('DROP TABLE stadiums');
    await queryRunner.query('DROP TABLE players');
    await queryRunner.query('DROP TABLE tournament_teams');
    await queryRunner.query('DROP TABLE teams');
    await queryRunner.query('DROP TABLE tournaments');
    await queryRunner.query('DROP TABLE api_keys');
    await queryRunner.query('DROP TABLE users');
    await queryRunner.query('DROP TYPE card_type_enum');
  }
}
