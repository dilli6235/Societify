/**
 * Consistent response envelope so every client (web + mobile) parses the
 * same shape. Success: { success: true, data, meta? }.
 * Failure is produced by the central error handler: { success:false, error }.
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export function ok<T>(data: T, meta?: PaginationMeta): ApiSuccess<T> {
  return meta ? { success: true, data, meta } : { success: true, data };
}
