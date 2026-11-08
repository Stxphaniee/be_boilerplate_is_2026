
import { ApiProperty } from '@nestjs/swagger';
import { TeamState, type Team } from '@PrismaClient';

export class TeamResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Tigres del Norte' })
  name!: string;

  @ApiProperty({ example: 'TDN' })
  shortName!: string;

  @ApiProperty({
    enum: TeamState,
    example: TeamState.PENDIENTE_VALIDACION,
    description: 'Estado actual de la inscripción del equipo.',
  })
  status!: TeamState;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Motivo del rechazo; solo viene informado si status es RECHAZADO.',
  })
  rejectionReason!: string | null;

  @ApiProperty({ format: 'uuid' })
  seasonId!: string;

  @ApiProperty({ format: 'uuid' })
  captainId!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromEntity(team: Team): TeamResponseDto {
    const dto = new TeamResponseDto();

    dto.id = team.id;
    dto.name = team.name;
    dto.shortName = team.shortName;
    dto.status = team.status;
    dto.rejectionReason = team.rejectionReason;
    dto.seasonId = team.seasonId;
    dto.captainId = team.captainId;
    dto.createdAt = team.createdAt;

    return dto;
  }
}
