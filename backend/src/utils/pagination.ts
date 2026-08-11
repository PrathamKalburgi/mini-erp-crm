import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/enums';
import { BadRequestError } from './errors';

export interface PaginationParams {
  page: number;
  page_size: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  let page = DEFAULT_PAGE;
  let page_size = DEFAULT_PAGE_SIZE;

  if (query.page !== undefined) {
    const parsedPage = parseInt(String(query.page), 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      throw new BadRequestError('Page parameter must be a positive integer', 'INVALID_QUERY_PARAMETER', [
        { field: 'page', code: 'INVALID_QUERY_PARAMETER', message: 'Page parameter must be a positive integer' },
      ]);
    }
    page = parsedPage;
  }

  if (query.page_size !== undefined) {
    const parsedPageSize = parseInt(String(query.page_size), 10);
    if (isNaN(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > MAX_PAGE_SIZE) {
      throw new BadRequestError(`Page size must be an integer between 1 and ${MAX_PAGE_SIZE}`, 'INVALID_QUERY_PARAMETER', [
        { field: 'page_size', code: 'INVALID_QUERY_PARAMETER', message: `Page size must be an integer between 1 and ${MAX_PAGE_SIZE}` },
      ]);
    }
    page_size = parsedPageSize;
  }

  return {
    page,
    page_size,
    skip: (page - 1) * page_size,
    take: page_size,
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  totalItems: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const total_pages = totalItems === 0 ? 0 : Math.ceil(totalItems / params.page_size);
  return {
    data,
    pagination: {
      page: params.page,
      page_size: params.page_size,
      total_items: totalItems,
      total_pages,
    },
  };
}
