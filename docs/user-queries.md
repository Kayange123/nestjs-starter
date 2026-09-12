# User list query contract

`GET /v1/users` requires an authenticated Admin. Pagination is shared; searching, sorting and filters are defined explicitly by the user resource.

```http
GET /v1/users?q=kayange&page=1&limit=10&sortBy=createdAt&order=DESC&createdFrom=2026-01-01T00:00:00Z
```

| Parameter | Contract |
| --- | --- |
| page | Integer >= 1; default 1; maximum 90071992547409 keeps offset arithmetic safe |
| limit | Integer 1–100; default 10 |
| q | Literal case-insensitive substring in firstName, lastName or email; maximum 100 characters; empty string applies no search |
| sortBy | id, firstName, lastName, email or createdAt; default createdAt |
| order | ASC or DESC; default DESC |
| createdFrom | Inclusive lower bound on createdAt; ISO timestamp with timezone |
| createdTo | Inclusive upper bound on createdAt; ISO timestamp with timezone |

Use URL encoding for timestamps with positive timezone offsets so the plus sign is not decoded as a space. Invalid dates, reversed ranges, unsupported query keys and invalid parameter values return 400. Dates without a time or timezone are rejected. Omitting a date bound leaves that side open.

Pagination accepts decimal digits, not fractions, exponent notation, hexadecimal, whitespace-only values or repeated parameters. No caller can turn pagination off.

Search fields are controlled by the backend and combined with OR; creation-date filters apply to every search branch. Percent, underscore and backslash are literal search characters, not PostgreSQL LIKE wildcards. TypeORM binds search values as query parameters.

Results sort by the requested field and then id in the same direction. Sorting by id uses id only. The default is createdAt DESC, id DESC. This provides deterministic ordering for a fixed dataset; offset pagination does not guarantee a snapshot across concurrent writes or separate page requests.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPreviousPage": false
  }
}
```

totalItems counts matching, non-deleted users before pagination. Empty results have totalPages 0. Pages beyond the final page return an empty data array and preserve the requested page. hasPreviousPage means the requested page is greater than 1, preserving the previous contract. Returned user properties are explicitly mapped to UserResponseDto; clients cannot request database columns or relations.

## Upgrade notes

- q, page, limit, sortBy, order and the data/pagination response envelope retain their names and defaults.
- all (including all=false), fields, sorts and dateRange are removed and return 400. Replace nested dateRange bounds with createdFrom/createdTo timestamps.
- Unlisted sort fields now return 400. Remove client-controlled projection and multi-sort parameters.
- q now treats LIKE metacharacters literally. Do not use percent or underscore as wildcard syntax.
- QueryOptionsDto and its TypeORM/response methods are removed. Resource DTOs extend PaginationQueryDto; services use resource query mappers and paginateResult.
- No status or role filter was invented; neither is part of the current resource query contract.

## Extending the design

Add validated resource fields to UserQueryDto and map them in repositories/user-query.mapper.ts. Keep database operators and response formatting out of request DTOs. Global validation must stay enabled.

Offset pagination uses take=limit and skip=(page-1)*limit, suitable for ordinary CRUD. Very deep offsets and substring searches may be expensive; a bounded page size is not a query-cost guarantee. Evaluate indexes and query plans against actual workloads before adding complexity.

For a future activity-feed or event resource, introduce a separate cursor DTO and response type. Validate an opaque cursor containing a timestamp and unique ID, use an allowlisted stable sort, and bind both values in a keyset predicate. Bind the cursor to the filter/order contract and fetch limit+1 records to detect the next page. Do not change this endpoint's offset contract or claim cursor support before implementing and testing that resource.

## PostgreSQL integration checks

Run `pnpm test:integration` with TEST_DATABASE_URL pointing to a disposable PostgreSQL database. Tests require schema-creation permission; each run creates a random pagination_* schema and drops only that schema afterward. They do not require or use the application's production database configuration.

HTTP contract tests run with `pnpm test:e2e --runInBand`; they use mocked persistence and real validation/guards. Unit metadata tests run with `pnpm test --runInBand`.
