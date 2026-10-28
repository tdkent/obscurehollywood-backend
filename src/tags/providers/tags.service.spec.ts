import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from 'src/tags/providers/tags.service';
import { Repository } from 'typeorm';
import { Tag } from 'src/tags/entities/tag.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetFilmsByTagDto, GetTagsDto } from 'src/tags/dto/get-tag.dto';
import { Film } from 'src/films/entities/film.entity';
import { PaginationProvider } from 'src/common/pagination/providers/pagination.provider';

describe('TagsService', () => {
  let service: TagsService;

  const mockPaginationProvider = {
    createPaginationMetadata: jest.fn(),
  };

  let repository: jest.Mocked<
    Pick<Repository<Partial<Tag>>, 'findAndCount' | 'findOne'>
  >;
  let filmRepository: jest.Mocked<
    Pick<Repository<Partial<Film>>, 'findAndCount'>
  >;
  const mockTagRepository: jest.Mocked<
    Pick<Repository<Partial<Tag>>, 'findAndCount' | 'findOne'>
  > = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };
  const mockFilmRepository: jest.Mocked<
    Pick<Repository<Partial<Film>>, 'findAndCount'>
  > = {
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    mockTagRepository.findAndCount.mockResolvedValue([[], 0]);
    mockTagRepository.findOne.mockResolvedValue({ id: 1 });
    mockFilmRepository.findAndCount.mockResolvedValue([[], 0]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        {
          provide: getRepositoryToken(Tag),
          useValue: mockTagRepository,
        },
        {
          provide: getRepositoryToken(Film),
          useValue: mockFilmRepository,
        },
        {
          provide: PaginationProvider,
          useValue: mockPaginationProvider,
        },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
    repository = module.get(getRepositoryToken(Tag));
    filmRepository = module.get(getRepositoryToken(Film));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const query: GetTagsDto = { orderBy: 'nameAsc', page: '1' };

    it('should call repository.findAndCount()', async () => {
      await service.findAll(query);
      expect(repository.findAndCount).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array if no data can be found', async () => {
      mockPaginationProvider.createPaginationMetadata.mockReturnValueOnce({
        data: [],
        links: {},
        meta: {},
      });
      const result = await service.findAll(query);
      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    const params = { slug: 'decade-1930s' };

    it('should call repository.findOne()', async () => {
      await service.findOne(params.slug);

      expect(repository.findOne).toHaveBeenCalledTimes(1);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: params.slug },
        }),
      );
    });

    it('should return the tag', async () => {
      const result = await service.findOne(params.slug);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('findFilmsByTag', () => {
    const params = { slug: 'decade-1930s' };
    const query: GetFilmsByTagDto = {
      orderBy: 'nameAsc',
      page: '1',
    };

    it('should call Film repository.find()', async () => {
      await service.findFilmsByTag(params.slug, query);

      expect(filmRepository.findAndCount).toHaveBeenCalledTimes(1);
      expect(filmRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: (Number(query.page) - 1) * 10,
          order: { sortName: 'ASC', releaseYear: 'ASC' },
        }),
      );
    });

    it('should return films and pagination metadata', async () => {
      const films: Partial<Film>[] = [{ id: 1 }, { id: 2 }, { id: 3 }];

      mockFilmRepository.findAndCount.mockResolvedValue([films, 3]);

      mockPaginationProvider.createPaginationMetadata.mockReturnValueOnce({
        data: films,
        links: {
          current: '',
          first: '',
        },
        meta: {
          currentPage: 1,
          totalItems: 3,
        },
      });

      const result = await service.findFilmsByTag(params.slug, query);

      expect(result.data).toEqual(films);
      expect(result.links.current).toBeDefined();
      expect(result.links.first).toBeDefined();
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalItems).toEqual(3);
    });

    it('should return an empty array if no data can be found', async () => {
      mockPaginationProvider.createPaginationMetadata.mockReturnValueOnce({
        data: [],
        links: {},
        meta: {},
      });

      const result = await service.findFilmsByTag(params.slug, query);

      expect(result.data).toEqual([]);
    });
  });
});
