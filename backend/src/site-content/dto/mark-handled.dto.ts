import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

/** Body for toggling a contact message's handled flag. */
export class MarkHandledDto {
  @ApiProperty({ example: true, description: 'Mark the message handled (true) or reopen (false)' })
  @IsBoolean()
  handled!: boolean;
}
