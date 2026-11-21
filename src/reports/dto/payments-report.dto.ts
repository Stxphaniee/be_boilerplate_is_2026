import { ApiProperty } from '@nestjs/swagger';
import { PaymentState } from '@PrismaClient';

export class PaymentReportItemDto {
  @ApiProperty()
  equipoId!: string;

  @ApiProperty()
  equipo!: string;

  @ApiProperty()
  monto!: number;

  @ApiProperty({ enum: PaymentState })
  estado!: PaymentState;

  @ApiProperty()
  fechaVencimiento!: Date;

  @ApiProperty({ nullable: true })
  fechaPago!: Date | null;
}

export class PaymentsReportResponseDto {
  @ApiProperty({ example: 12 })
  totalEquipos!: number;

  @ApiProperty({ example: 8 })
  pagados!: number;

  @ApiProperty({ example: 3 })
  pendientes!: number;

  @ApiProperty({ example: 1 })
  vencidos!: number;

  @ApiProperty({ example: 400 })
  totalRecaudado!: number;

  @ApiProperty({ type: [PaymentReportItemDto] })
  detalle!: PaymentReportItemDto[];
}
