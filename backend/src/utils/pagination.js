export function pagination(query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paged(rows, total, { page, pageSize }) {
  return { data: rows, pagination: { page, pageSize, total: Number(total) } };
}
