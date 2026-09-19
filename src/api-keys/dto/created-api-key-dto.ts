import { ApiProperty } from '@nestjs/swagger';

export class CreatedApiKeyDto {
  @ApiProperty({
    example: 'example-api-key-that-must-be-saved-by-the-client',
  })
  api_key: string;
}
