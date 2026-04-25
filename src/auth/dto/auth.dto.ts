import { IsString, IsNotEmpty } from 'class-validator';

export class JwtDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}