import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token obtenido en /auth/login' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
