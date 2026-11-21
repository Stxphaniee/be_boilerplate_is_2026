import { ApiProperty } from '@nestjs/swagger';

export class GalleryImageDto {
  @ApiProperty({ description: 'ID de la imagen de galería' })
  id: string;

  @ApiProperty({ description: 'URL de la imagen', example: 'https://example.com/image.jpg' })
  url: string;

  @ApiProperty({ description: 'Fecha de creación', type: String })
  createdAt: Date;
}
