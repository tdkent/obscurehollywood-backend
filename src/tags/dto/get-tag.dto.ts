import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/pagination/dtos/pagination-query.dto';
import { GetFilmsDto } from 'src/films/dto/get-films.dto';

class GetTagsBaseDto {
  @ApiProperty({
    description: "Option to sort tag list. Default: 'nameAsc'.",
    example: 'nameAsc',
  })
  @IsString()
  orderBy: string = 'nameAsc';
}

export class GetTagsDto extends IntersectionType(
  GetTagsBaseDto,
  PaginationQueryDto,
) {}

export class GetFilmsByTagDto extends OmitType(GetFilmsDto, ['tag']) {}
