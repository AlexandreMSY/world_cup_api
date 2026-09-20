import { ApiProperty } from '@nestjs/swagger';
import { MatchSummaryDto } from '../../matches/dto/match-summary.dto.js';

export class PlayerMatchSummaryDto extends MatchSummaryDto {
  @ApiProperty()
  starter: boolean;
}
