import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ApiKey } from '../api-keys/entities/api-key.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { Booking } from '../football/bookings/entities/booking.entity.js';
import { Goal } from '../football/goals/entities/goal.entity.js';
import { MatchPlayer } from '../football/matches/entities/match-player.entity.js';
import { Match } from '../football/matches/entities/match.entity.js';
import { Player } from '../football/players/entities/player.entity.js';
import { Stadium } from '../football/stadiums/entities/stadium.entity.js';
import { Substitution } from '../football/substitutions/entities/substitution.entity.js';
import { Team } from '../football/teams/entities/team.entity.js';
import { TournamentTeam } from '../football/tournaments/entities/tournament-team.entity.js';
import { Tournament } from '../football/tournaments/entities/tournament.entity.js';
import { InitialSchema1760000000000 } from './migrations/1760000000000-initial-schema.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  migrationsRun: false,
  entities: [
    User,
    ApiKey,
    Tournament,
    Team,
    TournamentTeam,
    Player,
    Stadium,
    Match,
    MatchPlayer,
    Goal,
    Booking,
    Substitution,
  ],
  migrations: [InitialSchema1760000000000],
});
