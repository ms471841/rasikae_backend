import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export enum FcmAction {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export class UpdateFcmTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsEnum(FcmAction)
  @IsNotEmpty()
  action: FcmAction;
}
