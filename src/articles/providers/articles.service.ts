import { Injectable } from '@nestjs/common';
import { PaginationProvider } from 'src/common/pagination/providers/pagination.provider';
import { GetArticlesDto } from 'src/articles/dto/get-articles.dto';
import { DataSource } from 'typeorm';
import { ArticleResponse } from 'src/articles/dto/article-response.dto';
import { validateParams } from 'src/common/utils/validate';
import { PAGINATION_TAKE_COUNT } from 'src/common/constants/constants';

@Injectable()
export class ArticlesService {
  constructor(
    /**
     * Inject data source (for raw query)
     */
    private readonly dataSource: DataSource,
    /**
     * Pagination provider
     */
    private paginationProvider: PaginationProvider,
  ) {}

  /**
   * Send a list of search results with pagination and sorting.
   */
  public async findAll(reqQuery: GetArticlesDto) {
    const { orderBy: orderParam, page: pageParam, q: searchString } = reqQuery;

    const { orderBy, page } = validateParams({
      orderParam,
      pageParam,
      route: 'articles',
    });

    let articles: Partial<ArticleResponse>[];
    let totalItems: number;

    if (!searchString || searchString.length < 2) {
      articles = [];
      totalItems = 0;
    } else {
      const searchResultsQb = await this.dataSource
        .createQueryBuilder()
        // CTE combines data from feature, film, person, studio, and tag tables
        // Searchable text is combined into "searchText" column
        // Related data (such as film cast/crew list) is aggregated into a string
        // Nullable rows are coalesced to prevent nulling all data in row
        // Gender row is required to display person fallback images

        // Included data:
        // feature: name, text content
        // film: name, release year, studio, text content, people, tags
        // person: name, text content, birth place, birth year, films
        // studio: name, other names, description, films
        // tag: name, description, films
        .addCommonTableExpression(
          `
          SELECT
            fe.slug,
            fe.name,
            'feature' AS category,
            CAST(null as person_gender_enum) AS gender,
            (fe.name || ' ' || COALESCE(a."textContent", '')) AS "searchText"
          FROM feature AS fe
          LEFT JOIN article AS a
          ON fe.slug = a.slug

          UNION

          SELECT
            fi.slug,
            fi.name,
            'film' AS category,
            CAST(null as person_gender_enum) AS gender,
            (fi.name || ' ' || fi."releaseYear" || ' ' ||
            (SELECT COALESCE(s.name, '') FROM film 
            LEFT JOIN studio s ON film."studioId" = s.id
            WHERE film.id = fi.id) || ' ' ||
            COALESCE(a."textContent", '') || ' ' ||
            (SELECT
              COALESCE(STRING_AGG(DISTINCT p.name, ' '), '')
              FROM film AS f
              LEFT JOIN person_film AS pf
              ON f.id = pf."filmId"
              LEFT JOIN person AS p
              ON p.id = pf."personId"
              WHERE f.id = fi.id
              GROUP BY f.id) || ' ' ||
            (SELECT
              COALESCE(STRING_AGG(t.name, ' '), '')
              FROM film AS f
              LEFT JOIN film_tag AS ft
              ON f.id = ft."filmId"
              LEFT JOIN tag AS t
              ON t.id = ft."tagId"
              WHERE f.id = fi.id
              GROUP BY f.id)
            ) AS "searchText"
          FROM film AS fi
          LEFT JOIN article AS a
          ON fi.slug = a.slug

          UNION

          SELECT
            p.slug,
            p.name,
            'person' AS category,
            p.gender AS gender,
            (p.name || ' ' ||
            COALESCE(a."textContent", '') || ' ' || 
            COALESCE(p."birthPlace", '') || ' ' || 
            COALESCE(p."deathPlace", '') || ' ' ||
            (SELECT
              COALESCE(STRING_AGG(DISTINCT f.name, ' '), '')
              FROM person AS pe
              LEFT JOIN person_film AS pf
              ON pe.id = pf."personId"
              LEFT JOIN film AS f
              ON f.id = pf."filmId"
              WHERE p.id = pe.id
              GROUP BY pe.id)) AS "searchText"
          FROM person AS p
          LEFT JOIN article as a
          ON p.slug = a.slug

          UNION

          SELECT
            s.slug,
            s.name,
            'studio' AS category,
            CAST(null as person_gender_enum) AS gender,
            (s.name || ' ' ||
            COALESCE(ARRAY_TO_STRING(s."otherNames", ' '), '') || ' ' ||
            COALESCE(s.description, '') || ' ' ||
            (SELECT
              COALESCE(STRING_AGG(f.name, ' '), '')
              FROM studio st
              LEFT JOIN film f
              ON st.id = f."studioId"
              WHERE st.id = s.id
              GROUP BY st.id)) AS "searchText"
          FROM studio AS s

          UNION

          SELECT
            t.slug,
            t.name,
            'tag' AS category,
            CAST(null as person_gender_enum) AS gender,
            (t.name || ' ' || COALESCE(t.description, '') || ' ' ||
            (SELECT
              COALESCE(STRING_AGG(f.name, ' '), '')
              FROM tag
              LEFT JOIN film_tag AS ft
              ON tag.id = ft."tagId"
              LEFT JOIN film AS f
              ON f.id = ft."filmId"
              WHERE tag.id = t.id
              GROUP BY tag.id
            )) AS "searchText"
          FROM tag AS t
        `,
          'search',
        )
        .select('row_number() over () as id')
        .addSelect('s.slug')
        .addSelect('s.name')
        .addSelect('s.gender')
        .addSelect('s.category')
        .addSelect(
          `ts_rank(
            to_tsvector(s."searchText"),
            websearch_to_tsquery(:searchString)
          )`,
          'rank',
        )
        .addSelect('COUNT(*) OVER() as count') // Get total row count w/o grouping
        .from('search', 's') // Same as `FROM search AS s`
        .where(
          `to_tsvector(s."searchText") 
          @@ websearch_to_tsquery(:searchString)`,
        )
        .setParameter('searchString', searchString)
        .orderBy('rank', 'DESC')
        .take(PAGINATION_TAKE_COUNT)
        .skip((page - 1) * PAGINATION_TAKE_COUNT)
        .getRawMany();

      const results = searchResultsQb as (Omit<
        ArticleResponse,
        'htmlContent'
      > & {
        rank: number;
        count: string;
      })[];

      totalItems = results.length ? Number(results[0].count) : 0;

      const searchLowercase = searchString.toLowerCase();

      articles = results
        .map((result) => {
          const nameLowercase = result.name.toLowerCase();

          if (searchLowercase === nameLowercase) {
            return { ...result, id: Number(result.id), rank: result.rank + 1 };
          }

          if (nameLowercase.includes(searchLowercase)) {
            return {
              ...result,
              id: Number(result.id),
              rank: result.rank + 0.5,
            };
          }

          return result;
        })
        .sort((a, b) => b.rank - a.rank);
    }

    const finalResponse = this.paginationProvider.createPaginationMetadata({
      data: articles,
      orderBy,
      page,
      q: searchString,
      totalItems,
    });

    return finalResponse;
  }
}
