import { ApiProperty } from '@nestjs/swagger';

export class DeletedApiKeyDto {
  @ApiProperty({ example: 'API key successfully deleted' })
  message: string;
}
