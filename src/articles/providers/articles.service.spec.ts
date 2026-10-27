import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesService } from 'src/articles/providers/articles.service';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { GetArticlesDto } from 'src/articles/dto/get-articles.dto';
import { PaginationProvider } from 'src/common/pagination/providers/pagination.provider';
import { Article } from 'src/articles/entities/article.entity';

describe('ArticlesService', () => {
  let service: ArticlesService;
  // let articleRepository: jest.Mocked<
  //   Pick<Repository<Partial<Article>>, 'count' | 'find'>
  // >;

  // Mock Article repository
  const mockArticleRepository: jest.Mocked<
    Pick<Repository<Partial<Article>>, 'count' | 'find'>
  > = {
    count: jest.fn(),
    find: jest.fn(),
  };

  // Mock createQueryBuilder object and all methods used in service
  const mockQueryBuilder = {
    addCommonTableExpression: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  } as unknown as SelectQueryBuilder<DataSource>;

  // Mock DataSource
  const mockDataSource = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  // Mock Pagination
  const mockPaginationProvider = {
    createPaginationMetadata: jest.fn(),
  };

  beforeEach(async () => {
    mockArticleRepository.count.mockResolvedValue(0);
    mockArticleRepository.find.mockResolvedValue([]);

    (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        {
          provide: getRepositoryToken(Article),
          useValue: mockArticleRepository,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        {
          provide: PaginationProvider,
          useValue: mockPaginationProvider,
        },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
    // articleRepository = module.get(getRepositoryToken(Article));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const query: GetArticlesDto = {
      orderBy: 'nameAsc',
      page: '1',
    };
    const queryWithSearch: GetArticlesDto = {
      orderBy: 'nameAsc',
      page: '1',
      q: 'search',
    };

    const articles: Partial<Article>[] = [
      { id: 1, name: 'ABC' },
      { id: 2, name: 'DEF' },
      { id: 3, name: 'GHI' },
    ];

    it('should call repository.createQueryBuilder() if search string is defined', async () => {
      await service.findAll(queryWithSearch);
      expect(mockDataSource.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('should return articles and pagination metadata if search string query is undefined', async () => {
      mockPaginationProvider.createPaginationMetadata.mockReturnValueOnce({
        data: articles,
        links: {
          current: '',
          first: '',
        },
        meta: {
          currentPage: 1,
          totalItems: 100,
        },
      });

      const result = await service.findAll(query);

      expect(result.data).toEqual(articles);
      expect(result.links.current).toBeDefined();
      expect(result.links.first).toBeDefined();
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.totalItems).toEqual(100);
    });

    it('should return articles and pagination metadata if search string query is defined', async () => {
      (mockQueryBuilder.getRawMany as jest.Mock).mockResolvedValue(articles);

      mockPaginationProvider.createPaginationMetadata.mockReturnValueOnce({
        data: articles,
        links: {
          current: '',
          first: '',
        },
        meta: {
          currentPage: 1,
          totalItems: 2,
        },
      });

      const result = await service.findAll(queryWithSearch);
      expect(result.data).toEqual(articles);
    });
  });
});
