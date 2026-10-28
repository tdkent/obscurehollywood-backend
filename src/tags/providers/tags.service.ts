import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from 'src/tags/entities/tag.entity';
import { GetFilmsByTagDto, GetTagsDto } from 'src/tags/dto/get-tag.dto';
import { Film } from 'src/films/entities/film.entity';
import { PaginationProvider } from 'src/common/pagination/providers/pagination.provider';
import { validateParams } from 'src/common/utils/validate';
import { PAGINATION_TAKE_COUNT } from 'src/common/constants/constants';

@Injectable()
export class TagsService {
  constructor(
    /**
     * Tags repository
     */
    @InjectRepository(Tag)
    private tagsRepository: Repository<Tag>,
    /**
     * Films repository
     */
    @InjectRepository(Film)
    private filmsRepository: Repository<Film>,
    /**
     * Pagination provider
     */
    private paginationProvider: PaginationProvider,
  ) {}
  public async findAll(reqQuery: GetTagsDto) {
    const { orderBy: orderParam, page: pageParam } = reqQuery;

    const { orderBy, page } = validateParams({
      orderParam,
      pageParam,
      route: 'tags',
    });

    const [data, count] = await this.tagsRepository.findAndCount({
      order: orderBy === 'nameAsc' ? { name: 'ASC' } : { name: 'DESC' },
      take: PAGINATION_TAKE_COUNT,
      skip: (page - 1) * PAGINATION_TAKE_COUNT,
    });

    const finalResponse = this.paginationProvider.createPaginationMetadata({
      data,
      orderBy,
      page,
      totalItems: count,
    });

    return finalResponse;
  }

  public async findOne(slug: string) {
    const tag = await this.tagsRepository.findOne({
      where: {
        slug,
      },
      relations: {
        filmTags: {
          film: true,
        },
      },
    });

    if (!tag) throw new NotFoundException();

    return tag;
  }

  public async findFilmsByTag(slug: string, reqQuery: GetFilmsByTagDto) {
    const { orderBy: orderParam, page: pageParam } = reqQuery;

    const { orderBy, page } = validateParams({
      orderParam,
      pageParam,
      route: 'films',
    });

    const [films, count] = await this.filmsRepository.findAndCount({
      where: {
        filmTags: {
          tag: {
            slug,
          },
        },
      },
      order:
        orderBy === 'nameDesc'
          ? { sortName: 'DESC', releaseYear: 'ASC' }
          : orderBy === 'yearAsc'
            ? { releaseYear: 'ASC', sortName: 'ASC' }
            : orderBy === 'yearDesc'
              ? { releaseYear: 'DESC', sortName: 'ASC' }
              : { sortName: 'ASC', releaseYear: 'ASC' },
      take: PAGINATION_TAKE_COUNT,
      skip: (page - 1) * PAGINATION_TAKE_COUNT,
    });

    const finalResponse = this.paginationProvider.createPaginationMetadata({
      data: films,
      orderBy,
      page,
      totalItems: count,
    });

    return finalResponse;
  }
}
