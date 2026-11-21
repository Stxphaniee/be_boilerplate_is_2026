
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/client.js';
import type { User } from '../../generated/prisma/client.js';

/**
 * Forma pública de un usuario.
 *
 * Los controladores devuelven esto y nunca la fila cruda de Prisma,
 * para que passwordHash no pueda filtrarse en una respuesta.
 */
export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'nestor@example.com',
    format: 'email',
  })
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
  })
  createdAt!: Date;

  static fromEntity(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
