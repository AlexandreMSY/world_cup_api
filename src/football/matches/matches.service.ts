import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, SelectQueryBuilder } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity.js';
import { Goal } from '../goals/entities/goal.entity.js';
import { Substitution } from '../substitutions/entities/substitution.entity.js';
import { PaginationQueryDto } from '../../common/pagination/dto/pagination-query.dto.js';
import {
  createPaginatedResponse,
  PaginatedResponse,
} from '../../common/pagination/pagination.js';
import {
  BookingDto,
  MatchDetailDto,
  MatchGoalsDto,
  MatchPlayerDto,
  MatchPlayersDto,
  MatchTeamPlayersDto,
  SubstitutionDto,
} from './dto/match-detail.dto.js';
import { MatchSummaryDto } from './dto/match-summary.dto.js';
import { MatchPlayer } from './entities/match-player.entity.js';
import { Match } from './entities/match.entity.js';

export function toMatchSummaryDto(match: Match): MatchSummaryDto {
  return {
    slug: match.slug,
    tournament: {
      slug: match.tournament.slug,
      name: match.tournament.name,
      year: match.tournament.year,
    },
    round: match.round,
    date: match.match_date,
    homeTeam: { slug: match.homeTeam.slug, name: match.homeTeam.name },
    awayTeam: { slug: match.awayTeam.slug, name: match.awayTeam.name },
    score: { home: match.home_score, away: match.away_score },
    stadium: match.stadium
      ? { slug: match.stadium.slug, ground: match.stadium.ground }
      : null,
  };
}

function toMatchPlayerDto(appearance: MatchPlayer): MatchPlayerDto {
  return {
    slug: appearance.player.slug,
    name: appearance.player.name,
    position: appearance.position,
    shirtNumber: appearance.shirt_number,
    captain: appearance.captain,
  };
}

function createTeamPlayers(
  appearances: MatchPlayer[],
  team: Match['homeTeam'],
): MatchTeamPlayersDto {
  const teamAppearances = appearances.filter(
    (appearance) => appearance.team.id === team.id,
  );

  return {
    slug: team.slug,
    name: team.name,
    startingXI: teamAppearances
      .filter((appearance) => appearance.starter)
      .map(toMatchPlayerDto),
    bench: teamAppearances
      .filter((appearance) => !appearance.starter)
      .map(toMatchPlayerDto),
  };
}

function createPlayersDto(
  appearances: MatchPlayer[],
  match: Match,
): MatchPlayersDto {
  return {
    homeTeam: createTeamPlayers(appearances, match.homeTeam),
    awayTeam: createTeamPlayers(appearances, match.awayTeam),
  };
}

function toGoalDto(goal: Goal) {
  return {
    team: { slug: goal.team.slug, name: goal.team.name },
    player: { slug: goal.player.slug, name: goal.player.name },
    minute: goal.minute,
    addedTime: goal.added_time,
    penalty: goal.penalty,
    ownGoal: goal.own_goal,
  };
}

function createGoalsDto(goals: Goal[], match: Match): MatchGoalsDto {
  return {
    homeTeam: goals
      .filter((goal) => goal.team.id === match.homeTeam.id)
      .map(toGoalDto),
    awayTeam: goals
      .filter((goal) => goal.team.id === match.awayTeam.id)
      .map(toGoalDto),
  };
}

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(MatchPlayer)
    private readonly matchPlayersRepository: Repository<MatchPlayer>,
    @InjectRepository(Goal)
    private readonly goalsRepository: Repository<Goal>,
    @InjectRepository(Substitution)
    private readonly substitutionsRepository: Repository<Substitution>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  private createSummaryQuery(): SelectQueryBuilder<Match> {
    return this.matchesRepository
      .createQueryBuilder('match')
      .innerJoinAndSelect('match.tournament', 'tournament')
      .innerJoinAndSelect('match.homeTeam', 'homeTeam')
      .innerJoinAndSelect('match.awayTeam', 'awayTeam')
      .leftJoinAndSelect('match.stadium', 'stadium')
      .select([
        'match.id',
        'match.slug',
        'match.round',
        'match.match_date',
        'match.kickoff_time',
        'match.home_score',
        'match.away_score',
        'tournament.id',
        'tournament.slug',
        'tournament.name',
        'tournament.year',
        'homeTeam.id',
        'homeTeam.slug',
        'homeTeam.name',
        'awayTeam.id',
        'awayTeam.slug',
        'awayTeam.name',
        'stadium.id',
        'stadium.slug',
        'stadium.ground',
      ]);
  }

  private async paginateSummaryQuery(
    query: SelectQueryBuilder<Match>,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const [matches, totalItems] = await query
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('match.kickoff_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('match.slug', 'ASC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return createPaginatedResponse(
      matches.map(toMatchSummaryDto),
      totalItems,
      pagination,
    );
  }

  async findByTournament(
    tournamentId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.paginateSummaryQuery(
      this.createSummaryQuery().where('match.tournament_id = :tournamentId', {
        tournamentId,
      }),
      pagination,
    );
  }

  async findByTeam(
    teamId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const query = this.createSummaryQuery()
      .where(
        new Brackets((where) => {
          where
            .where('match.home_team_id = :teamId', { teamId })
            .orWhere('match.away_team_id = :teamId', { teamId });
        }),
      )
      .distinct(true);

    return await this.paginateSummaryQuery(query, pagination);
  }

  async findAll(
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.paginateSummaryQuery(
      this.createSummaryQuery(),
      pagination,
    );
  }

  async findByStadium(
    stadiumId: string,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    return await this.paginateSummaryQuery(
      this.createSummaryQuery().where('match.stadium_id = :stadiumId', {
        stadiumId,
      }),
      pagination,
    );
  }

  async findOne(slug: string): Promise<MatchDetailDto> {
    const match = await this.createSummaryQuery()
      .addSelect([
        'match.home_score_et',
        'match.away_score_et',
        'match.home_score_penalties',
        'match.away_score_penalties',
      ])
      .where('match.slug = :slug', { slug })
      .getOne();

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const [appearances, goals, substitutions, bookings] = await Promise.all([
      this.findAppearancesByMatchId(match.id),
      this.findGoalsByMatchId(match.id),
      this.findSubstitutionsByMatchId(match.id),
      this.findBookingsByMatchId(match.id),
    ]);

    return {
      ...toMatchSummaryDto(match),
      kickoffTime: match.kickoff_time,
      scoreExtraTime:
        match.home_score_et === null || match.away_score_et === null
          ? null
          : { home: match.home_score_et, away: match.away_score_et },
      scorePenalties:
        match.home_score_penalties === null ||
        match.away_score_penalties === null
          ? null
          : {
              home: match.home_score_penalties,
              away: match.away_score_penalties,
            },
      players: createPlayersDto(appearances, match),
      goals: createGoalsDto(goals, match),
      substitutions: substitutions.map((substitution): SubstitutionDto => ({
        team: {
          slug: substitution.team.slug,
          name: substitution.team.name,
        },
        playerOut: {
          slug: substitution.playerOut.slug,
          name: substitution.playerOut.name,
        },
        playerIn: {
          slug: substitution.playerIn.slug,
          name: substitution.playerIn.name,
        },
        minute: substitution.minute,
        addedTime: substitution.added_time,
      })),
      bookings: bookings.map((booking): BookingDto => ({
        team: { slug: booking.team.slug, name: booking.team.name },
        player: { slug: booking.player.slug, name: booking.player.name },
        cardType: booking.card_type,
        minute: booking.minute,
        addedTime: booking.added_time,
      })),
    };
  }

  async findPlayers(slug: string): Promise<MatchPlayersDto> {
    const match = await this.findMatchContext(slug);
    const appearances = await this.findAppearancesByMatchId(match.id);

    return createPlayersDto(appearances, match);
  }

  async findGoals(slug: string): Promise<MatchGoalsDto> {
    const match = await this.findMatchContext(slug);
    const goals = await this.findGoalsByMatchId(match.id);

    return createGoalsDto(goals, match);
  }

  private async findMatchContext(slug: string): Promise<Match> {
    const match = await this.createSummaryQuery()
      .where('match.slug = :slug', { slug })
      .getOne();

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return match;
  }

  private async findAppearancesByMatchId(
    matchId: string,
  ): Promise<MatchPlayer[]> {
    return await this.matchPlayersRepository
      .createQueryBuilder('appearance')
      .innerJoinAndSelect('appearance.player', 'player')
      .innerJoinAndSelect('appearance.team', 'team')
      .where('appearance.match_id = :matchId', { matchId })
      .orderBy('team.slug', 'ASC')
      .addOrderBy('appearance.starter', 'DESC')
      .addOrderBy('appearance.shirt_number', 'ASC', 'NULLS LAST')
      .addOrderBy('player.name', 'ASC')
      .addOrderBy('appearance.id', 'ASC')
      .getMany();
  }

  private async findGoalsByMatchId(matchId: string): Promise<Goal[]> {
    return await this.goalsRepository
      .createQueryBuilder('goal')
      .innerJoinAndSelect('goal.player', 'player')
      .innerJoinAndSelect('goal.team', 'team')
      .where('goal.match_id = :matchId', { matchId })
      .orderBy('goal.minute', 'ASC', 'NULLS LAST')
      .addOrderBy('goal.added_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('goal.id', 'ASC')
      .getMany();
  }

  private async findSubstitutionsByMatchId(
    matchId: string,
  ): Promise<Substitution[]> {
    return await this.substitutionsRepository
      .createQueryBuilder('substitution')
      .innerJoinAndSelect('substitution.team', 'team')
      .innerJoinAndSelect('substitution.playerOut', 'playerOut')
      .innerJoinAndSelect('substitution.playerIn', 'playerIn')
      .where('substitution.match_id = :matchId', { matchId })
      .orderBy('substitution.minute', 'ASC', 'NULLS LAST')
      .addOrderBy('substitution.added_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('substitution.id', 'ASC')
      .getMany();
  }

  private async findBookingsByMatchId(matchId: string): Promise<Booking[]> {
    return await this.bookingsRepository
      .createQueryBuilder('booking')
      .innerJoinAndSelect('booking.team', 'team')
      .innerJoinAndSelect('booking.player', 'player')
      .where('booking.match_id = :matchId', { matchId })
      .orderBy('booking.minute', 'ASC', 'NULLS LAST')
      .addOrderBy('booking.added_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('booking.id', 'ASC')
      .getMany();
  }
}
