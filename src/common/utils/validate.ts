import * as z from 'zod';

interface Inputs {
  orderParam: string;
  pageParam: string;
  route:
    'articles' | 'features' | 'films' | 'people' | 'quiz' | 'studios' | 'tags';
}

/** Validate and return coerced URL search params. */
export function validateParams({ route, pageParam, orderParam }: Inputs) {
  // Validate page
  const Page = z.coerce.number().int().positive();
  const { success: validPage } = Page.safeParse(pageParam);

  // Validate orderBy
  const NameOrder = z.literal(['nameAsc', 'nameDesc']);
  const PeopleOrder = z.literal([
    'firstNameAsc',
    'firstNameDesc',
    'lastNameAsc',
    'lastNameDesc',
  ]);
  const FilmOrder = z.literal(['nameAsc', 'nameDesc', 'yearAsc', 'yearDesc']);

  let validOrder: string;

  switch (route) {
    case 'articles':
    case 'features':
    case 'quiz':
    case 'studios':
    case 'tags': {
      const { success } = NameOrder.safeParse(orderParam);
      validOrder = success ? orderParam : 'nameAsc';
      break;
    }

    case 'films': {
      const { success } = FilmOrder.safeParse(orderParam);
      validOrder = success ? orderParam : 'nameAsc';
      break;
    }

    case 'people': {
      const { success } = PeopleOrder.safeParse(orderParam);
      validOrder = success ? orderParam : 'lastNameAsc';
      break;
    }

    default:
      throw new Error('Invalid route.');
  }

  const params = {
    page: validPage ? Number(pageParam) : 1,
    orderBy: validOrder,
  };

  return params;
}
