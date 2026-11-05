import {
  IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsOptional, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'juan.perez@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Contraseña123!', minLength: 8 })
  @IsString() @IsNotEmpty() @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString() @IsNotEmpty() @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean() @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Si debe cambiar esta contraseña en su primer login. Default: true.' })
  @IsBoolean() @IsOptional()
  mustChangePassword?: boolean;
}
