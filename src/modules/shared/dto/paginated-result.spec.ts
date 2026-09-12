import { paginateResult } from './paginated-result';

describe('pagination metadata', () => {
  it.each([
    [1, 10, 25, 3, true, false],
    [2, 10, 25, 3, true, true],
    [3, 10, 25, 3, false, true],
    [1, 10, 0, 0, false, false],
    [1, 10, 1, 1, false, false],
    [4, 10, 25, 3, false, true],
  ])(
    'page %s limit %s total %s',
    (page, limit, totalItems, totalPages, hasNextPage, hasPreviousPage) => {
      expect(
        paginateResult(
          [],
          totalItems as number,
          page as number,
          limit as number,
        ),
      ).toEqual({
        data: [],
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      });
    },
  );
});
