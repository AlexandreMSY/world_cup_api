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
  MatchPlayerDto,
  SubstitutionDto,
  TeamLineupDto,
} from './dto/match-detail.dto.js';
import { MatchSummaryDto } from './dto/match-summary.dto.js';
import { MatchPlayer } from './entities/match-player.entity.js';
import { Match } from './entities/match.entity.js';

export function toMatchSummaryDto(match: Match): MatchSummaryDto {
  return {
    id: match.id,
    tournament: {
      id: match.tournament.id,
      name: match.tournament.name,
      year: match.tournament.year,
    },
    round: match.round,
    date: match.match_date,
    homeTeam: { id: match.homeTeam.id, name: match.homeTeam.name },
    awayTeam: { id: match.awayTeam.id, name: match.awayTeam.name },
    score: { home: match.home_score, away: match.away_score },
    stadium: match.stadium
      ? { id: match.stadium.id, ground: match.stadium.ground }
      : null,
  };
}

function toMatchPlayerDto(appearance: MatchPlayer): MatchPlayerDto {
  return {
    id: appearance.player.id,
    name: appearance.player.name,
    position: appearance.position,
    shirtNumber: appearance.shirt_number,
    captain: appearance.captain,
  };
}

function createTeamLineup(
  appearances: MatchPlayer[],
  teamId: string,
): TeamLineupDto {
  const teamAppearances = appearances.filter(
    (appearance) => appearance.team.id === teamId,
  );

  return {
    startingXi: teamAppearances
      .filter((appearance) => appearance.starter)
      .map(toMatchPlayerDto),
    bench: teamAppearances
      .filter((appearance) => !appearance.starter)
      .map(toMatchPlayerDto),
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
      .leftJoinAndSelect('match.stadium', 'stadium');
  }

  private async paginateSummaryQuery(
    query: SelectQueryBuilder<Match>,
    pagination: PaginationQueryDto,
  ): Promise<PaginatedResponse<MatchSummaryDto>> {
    const [matches, totalItems] = await query
      .orderBy('match.match_date', 'ASC')
      .addOrderBy('match.kickoff_time', 'ASC', 'NULLS FIRST')
      .addOrderBy('match.id', 'ASC')
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
    const query = this.createSummaryQuery().where(
      'match.tournament_id = :tournamentId',
      { tournamentId },
    );

    return await this.paginateSummaryQuery(query, pagination);
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
    const query = this.createSummaryQuery().where(
      'match.stadium_id = :stadiumId',
      { stadiumId },
    );

    return await this.paginateSummaryQuery(query, pagination);
  }
  async findOne(id: string): Promise<MatchDetailDto> {
    const match = await this.createSummaryQuery()
      .where('match.id = :id', { id })
      .getOne();

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const [appearances, goals, substitutions, bookings] = await Promise.all([
      this.findAppearances(id),
      this.findGoals(id),
      this.findSubstitutions(id),
      this.findBookings(id),
    ]);

    // Goal ownership uses the credited team, so own goals appear for the opponent.
    const toGoalDto = (goal: Goal) => ({
      id: goal.id,
      team: { id: goal.team.id, name: goal.team.name },
      player: { id: goal.player.id, name: goal.player.name },
      minute: goal.minute,
      addedTime: goal.added_time,
      penalty: goal.penalty,
      ownGoal: goal.own_goal,
    });

    return {
      ...toMatchSummaryDto(match),
      kickoffTime: match.kickoff_time,
      extraTimeScore:
        match.home_score_et === null || match.away_score_et === null
          ? null
          : { home: match.home_score_et, away: match.away_score_et },
      penaltyScore:
        match.home_score_penalties === null ||
        match.away_score_penalties === null
          ? null
          : {
              home: match.home_score_penalties,
              away: match.away_score_penalties,
            },
      lineups: {
        homeTeam: createTeamLineup(appearances, match.homeTeam.id),
        awayTeam: createTeamLineup(appearances, match.awayTeam.id),
      },
      goals: {
        homeTeam: goals
          .filter((goal) => goal.team.id === match.homeTeam.id)
          .map(toGoalDto),
        awayTeam: goals
          .filter((goal) => goal.team.id === match.awayTeam.id)
          .map(toGoalDto),
      },
      substitutions: substitutions.map((substitution): SubstitutionDto => ({
        id: substitution.id,
        team: {
          id: substitution.team.id,
          name: substitution.team.name,
        },
        playerOut: {
          id: substitution.playerOut.id,
          name: substitution.playerOut.name,
        },
        playerIn: {
          id: substitution.playerIn.id,
          name: substitution.playerIn.name,
        },
        minute: substitution.minute,
        addedTime: substitution.added_time,
      })),
      bookings: bookings.map((booking): BookingDto => ({
        id: booking.id,
        team: { id: booking.team.id, name: booking.team.name },
        player: { id: booking.player.id, name: booking.player.name },
        cardType: booking.card_type,
        minute: booking.minute,
        addedTime: booking.added_time,
      })),
    };
  }

  private async findAppearances(matchId: string): Promise<MatchPlayer[]> {
    return await this.matchPlayersRepository
      .createQueryBuilder('appearance')
      .innerJoinAndSelect('appearance.player', 'player')
      .innerJoinAndSelect('appearance.team', 'team')
      .where('appearance.match_id = :matchId', { matchId })
      .orderBy('team.id', 'ASC')
      .addOrderBy('appearance.starter', 'DESC')
      .addOrderBy('appearance.shirt_number', 'ASC', 'NULLS LAST')
      .addOrderBy('player.name', 'ASC')
      .addOrderBy('appearance.id', 'ASC')
      .getMany();
  }

  private async findGoals(matchId: string): Promise<Goal[]> {
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

  private async findSubstitutions(matchId: string): Promise<Substitution[]> {
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

  private async findBookings(matchId: string): Promise<Booking[]> {
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
