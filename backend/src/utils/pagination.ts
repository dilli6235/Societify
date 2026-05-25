import type { PaginationMeta } from '@/core/http/ApiResponse';

export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function resolvePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildMeta(p: PageParams, total: number): PaginationMeta {
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages: Math.ceil(total / p.pageSize) || 1,
  };
}
