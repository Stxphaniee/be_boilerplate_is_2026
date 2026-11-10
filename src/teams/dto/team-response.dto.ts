import { ApiProperty } from '@nestjs/swagger';
import { Position, TeamState, type Team, type Player } from '@PrismaClient';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PlayerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  dui!: string;

  @ApiProperty()
  birthDate!: Date;

  @ApiProperty({ enum: Position })
  position!: Position;

  @ApiProperty()
  jerseyNumber!: number;

  static fromEntity(player: Player): PlayerResponseDto {
    const dto = new PlayerResponseDto();

    dto.id = player.id;
    dto.name = player.name;
    dto.dui = player.dui;
    dto.birthDate = player.birthDate;
    dto.position = player.position;
    dto.jerseyNumber = player.jerseyNumber;

    return dto;
  }
}

export class TeamResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  shortName!: string;

  @ApiProperty({ enum: TeamState })
  status!: TeamState;

  @ApiProperty({ nullable: true })
  rejectionReason!: string | null;

  @ApiProperty({ format: 'uuid' })
  seasonId!: string;

  @ApiProperty({ format: 'uuid' })
  captainId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: [PlayerResponseDto] })
  players!: PlayerResponseDto[];

  @ApiPropertyOptional()
  captainEmail?: string;

  static fromEntity(
    team: Team & {
      players: Player[];
      captain?: { email: string };
    },
  ): TeamResponseDto {
    const dto = new TeamResponseDto();

    dto.id = team.id;
    dto.name = team.name;
    dto.shortName = team.shortName;
    dto.status = team.status;
    dto.rejectionReason = team.rejectionReason;
    dto.seasonId = team.seasonId;
    dto.captainId = team.captainId;
    dto.createdAt = team.createdAt;
    dto.players = team.players.map(PlayerResponseDto.fromEntity);

    if (team.captain) {
      dto.captainEmail = team.captain.email;
    }
    return dto;
  }
}
