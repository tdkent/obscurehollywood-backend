import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/common/pagination/dtos/pagination-query.dto';

class GetPersonsBaseDto {
  @ApiProperty({
    description: "Option to sort film list. Default: 'lastNameAsc'.",
    example: 'lastNameAsc',
  })
  @IsString()
  orderBy: string = 'lastNameAsc';

  @ApiProperty({
    description:
      'Optional query to return all people including those without an article.',
  })
  @IsOptional()
  @IsString()
  showAll?: string;
}

export class GetPersonsDto extends IntersectionType(
  GetPersonsBaseDto,
  PaginationQueryDto,
) {}
