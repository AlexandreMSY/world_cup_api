import { ApiProperty } from '@nestjs/swagger';
import { BasicTeamDto } from '../../matches/dto/match-summary.dto.js';

export class PlayerDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ type: BasicTeamDto })
  team: BasicTeamDto;
}
