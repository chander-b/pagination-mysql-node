
// add your DB connection here
const { executeQuery } = require('../../db/connection');

/**
 * Fetches data from a database with support for pagination, filters, sorting, grouping, and joins.
 *
 * @param {Object} param0 - Configuration object for query generation.
 * @param {string} param0.tableName - The name of the database table to query. (Required)
 * @param {string} param0.defaultWhereConditions - default WHERE conditions to query.
 * @param {Array} param0.joins - An array of join objects containing `type`, `table`, and `on` for JOIN clauses.
 * @param {Object} param0.filters - An object with column-value pairs for WHERE clauses. Supports arrays for `IN` and strings for `LIKE`.
 * @param {Array} param0.sort - An array of sorting objects containing `column` and `order` (e.g., `ASC` or `DESC`).
 * @param {Array} param0.groupBy - An array of column names to group the result by.
 * @param {Array} param0.columns - An array of column names to select. Defaults to `['*']` for all columns.
 * @param {number} param0.page - The page number for pagination. Defaults to `1`.
 * @param {number} param0.limit - The number of rows per page for pagination. Defaults to `10`.
 * @param {boolean} param0.countQuery - If `true`, generate a query without LIMIT/OFFSET for counting rows. Defaults to `false`.
 * @returns {Promise<Array>} - Returns a promise resolving to the result set from the query.
 * @throws {Error} - Throws an error if `tableName` is not provided or the query execution fails.
 */
async function getDataWithPaginationFiltersSort({
  tableName = '',
  defaultWhereConditions = '',
  joins = [],
  filters = {},
  sort = [],
  groupBy = [],
  columns = ['*'],
  page = 1,
  limit = 10,
  countQuery = false,
}) {
  if (!tableName) throw new Error('Table name is required.');

  // Calculate the offset for pagination
  const offset = (page - 1) * limit;

  // Start building the base SQL query
  let query = `SELECT ${columns.join(', ')} FROM ${tableName}`;

  // Add JOIN clauses dynamically based on input
  joins.forEach((join) => {
    query += ` ${join.type || 'LEFT JOIN'} ${join.table} ON ${join.on}`;
  });

  // Construct WHERE clauses and collect parameters
  const whereClauses = [defaultWhereConditions];
  const queryParams = [];

  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === 'object' && value.start && value.end) {
      whereClauses.push(`${key} BETWEEN ? AND ?`);
      queryParams.push(value.start, value.end);
    } else if (Array.isArray(value)) {
      whereClauses.push(`${key} IN (${value.map(() => '?').join(', ')})`);
      queryParams.push(...value);
    } else if (value !== null && value !== undefined) {
      whereClauses.push(`${key} = ?`);
      queryParams.push(`${value}`);
    }
  }

  // Add the WHERE clause if there are any conditions
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  // Add GROUP BY clause if specified and not a count query
  if (groupBy.length > 0) {
    query += ` GROUP BY ${groupBy.join(', ')}`;
  }

  // Add ORDER BY clause for sorting if specified
  if (sort.length > 0) {
    const sortClauses = sort.map(
      ({ column, order }) => `${column} ${order.toUpperCase()}`
    );
    query += ` ORDER BY ${sortClauses.join(', ')}`;
  }

  // Add LIMIT and OFFSET for pagination unless it's a count query
  if (!countQuery) {
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
  }

  // Execute the query and return results
  try {
    const rows = await executeQuery(query, queryParams);
    return rows;
  } catch (err) {
    console.error('Error executing query:', err.message);
    throw err;
  }
}

module.exports = {
  getDataWithPaginationFiltersSort,
};
