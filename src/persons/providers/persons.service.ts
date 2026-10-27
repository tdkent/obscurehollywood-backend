import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PAGINATION_TAKE_COUNT } from 'src/common/constants/constants';
import { PaginationProvider } from 'src/common/pagination/providers/pagination.provider';
import { validateParams } from 'src/common/utils/validate';
import { GetPersonsDto } from 'src/persons/dto/get-persons.dto';
import { Person } from 'src/persons/entities/person.entity';
import { IsNull, Not, Repository } from 'typeorm';

@Injectable()
export class PersonsService {
  constructor(
    /**
     * Persons repository
     */
    @InjectRepository(Person)
    private personsRepository: Repository<Person>,
    /**
     * Pagination provider
     */
    private paginationProvider: PaginationProvider,
  ) {}
  /**
   * Send a list of persons with pagination and sorting.
   */
  public async findAll(reqQuery: GetPersonsDto) {
    const { orderBy: orderParam, page: pageParam, showAll } = reqQuery;

    const { orderBy, page } = validateParams({
      orderParam,
      pageParam,
      route: 'people',
    });

    const [data, count] = await this.personsRepository.findAndCount({
      where: {
        article: showAll !== 'true' && Not(IsNull()),
      },
      order:
        orderBy === 'lastNameDesc'
          ? { lastName: 'DESC', firstName: 'DESC' }
          : orderBy === 'firstNameAsc'
            ? { firstName: 'ASC', lastName: 'ASC' }
            : orderBy === 'firstNameDesc'
              ? { firstName: 'DESC', lastName: 'DESC' }
              : { lastName: 'ASC', firstName: 'ASC' },
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

  public async findRecent() {
    return this.personsRepository.find({
      where: {
        article: Not(IsNull()),
      },
      relations: {
        article: true,
      },
      select: {
        article: {
          publishDate: true,
        },
      },
      order: {
        article: {
          publishDate: 'DESC',
        },
      },
      take: 3,
    });
  }

  public async findOne(slug: string) {
    const person = await this.personsRepository.findOne({
      where: { slug },
      relations: {
        article: {
          incomingRelations: {
            article: true,
          },
        },
        personFilms: {
          film: true,
        },
      },
    });

    if (!person) throw new NotFoundException();

    return person;
  }
}
