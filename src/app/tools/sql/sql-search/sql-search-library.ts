// SQL pattern library (reviewed and expanded).
// Conventions:
//  - Every script is read-only unless the category is "Write operations".
//  - Parameters are DECLAREd at the top so you only edit values, not the query.
//  - Object names are resolved with OBJECT_ID(), so use 'schema.table' to avoid ambiguity.
//  - DMV-based scripts need VIEW SERVER STATE (or VIEW DATABASE STATE on Azure SQL).
//  - STRING_AGG requires SQL Server 2017+ (compatibility level 140+).

export interface Pattern {
  title: string;
  description: string;
  database: string;
  category: string;
  tags: string;
  sql: string;
}

// Shared SQL fragments (alias `c` = sys.columns / sys.identity_columns row).
const COLUMN_TYPE = `TYPE_NAME(c.user_type_id) + CASE
        WHEN TYPE_NAME(c.user_type_id) IN (N'varchar', N'char', N'varbinary', N'binary')
            THEN N'(' + CASE WHEN c.max_length = -1 THEN N'max' ELSE CAST(c.max_length AS nvarchar(10)) END + N')'
        WHEN TYPE_NAME(c.user_type_id) IN (N'nvarchar', N'nchar')
            THEN N'(' + CASE WHEN c.max_length = -1 THEN N'max' ELSE CAST(c.max_length / 2 AS nvarchar(10)) END + N')'
        WHEN TYPE_NAME(c.user_type_id) IN (N'decimal', N'numeric')
            THEN N'(' + CAST(c.precision AS nvarchar(10)) + N', ' + CAST(c.scale AS nvarchar(10)) + N')'
        ELSE N''
    END`;

// Extracts the statement that is actually running from a batch (req = alias holding the offsets, txt = alias of sys.dm_exec_sql_text).
const currentStatement = (
  req: string,
  txt: string,
) => `SUBSTRING(${txt}.text, ${req}.statement_start_offset / 2 + 1,
        (CASE WHEN ${req}.statement_end_offset = -1 THEN DATALENGTH(${txt}.text) ELSE ${req}.statement_end_offset END
         - ${req}.statement_start_offset) / 2 + 1)`;

export const PATTERNS: Pattern[] = [
  // ───────────────────────────── Schema ─────────────────────────────
  {
    title: "Find a table, view or column",
    description:
      "Search tables, views and columns by name across the current database. Wildcard characters in the search text are treated literally.",
    database: "SQL Server",
    category: "Schema",
    tags: "table view column search object metadata sys tables columns find name",
    sql: `DECLARE @Search nvarchar(128) = N'Customer';
DECLARE @Like nvarchar(300) = N'%' + REPLACE(REPLACE(REPLACE(@Search, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';

SELECT
    SCHEMA_NAME(o.schema_id) AS schema_name,
    o.name AS object_name,
    o.type_desc,
    c.name AS column_name,
    ${COLUMN_TYPE} AS data_type,
    c.is_nullable
FROM sys.objects AS o
JOIN sys.columns AS c ON c.object_id = o.object_id
WHERE o.type IN (N'U', N'V')
  AND o.is_ms_shipped = 0
  AND (o.name LIKE @Like OR c.name LIKE @Like)
ORDER BY schema_name, object_name, c.column_id;`,
  },
  {
    title: "Describe a table",
    description:
      "Columns with full data type, nullability, identity, computed flag, default and primary-key membership. A readable alternative to sp_help.",
    database: "SQL Server",
    category: "Schema",
    tags: "describe table structure columns datatype identity default primary key sp_help definition",
    sql: `DECLARE @Table nvarchar(300) = N'dbo.Orders';

SELECT
    c.column_id,
    c.name AS column_name,
    ${COLUMN_TYPE} AS data_type,
    c.is_nullable,
    c.is_identity,
    c.is_computed,
    dc.definition AS default_definition,
    CASE WHEN pk.column_id IS NULL THEN 0 ELSE 1 END AS is_primary_key
FROM sys.columns AS c
LEFT JOIN sys.default_constraints AS dc
    ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
LEFT JOIN (
    SELECT ic.object_id, ic.column_id
    FROM sys.indexes AS i
    JOIN sys.index_columns AS ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    WHERE i.is_primary_key = 1
) AS pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
WHERE c.object_id = OBJECT_ID(@Table)
ORDER BY c.column_id;`,
  },
  {
    title: "Table sizes and row counts",
    description:
      "Row count and reserved/used space per table, largest first. Row counts come from metadata, so they are instant and approximate under heavy write load.",
    database: "SQL Server",
    category: "Schema",
    tags: "table size rows row count space mb storage largest disk",
    sql: `SELECT
    SCHEMA_NAME(t.schema_id) AS schema_name,
    t.name AS table_name,
    SUM(CASE WHEN ps.index_id IN (0, 1) THEN ps.row_count ELSE 0 END) AS row_count,
    CAST(SUM(ps.reserved_page_count) * 8 / 1024.0 AS decimal(18, 2)) AS reserved_mb,
    CAST(SUM(ps.used_page_count) * 8 / 1024.0 AS decimal(18, 2)) AS used_mb
FROM sys.tables AS t
JOIN sys.dm_db_partition_stats AS ps ON ps.object_id = t.object_id
WHERE t.is_ms_shipped = 0
GROUP BY t.schema_id, t.name
ORDER BY reserved_mb DESC;`,
  },
  {
    title: "Recently modified objects",
    description:
      'Tables, views, procedures, functions and triggers created or altered in the last N days. Useful for "what changed?" after a deployment.',
    database: "SQL Server",
    category: "Schema",
    tags: "recent changed modified altered created deployment objects procedure view function trigger",
    sql: `DECLARE @Days int = 7;

SELECT
    SCHEMA_NAME(o.schema_id) AS schema_name,
    o.name AS object_name,
    o.type_desc,
    o.create_date,
    o.modify_date
FROM sys.objects AS o
WHERE o.is_ms_shipped = 0
  AND o.type IN (N'U', N'V', N'P', N'FN', N'IF', N'TF', N'TR')
  AND o.modify_date >= DATEADD(DAY, -@Days, GETDATE())
ORDER BY o.modify_date DESC;`,
  },
  {
    title: "Tables without a primary key",
    description:
      "Finds tables with no primary key, and flags whether they are heaps or have another unique index.",
    database: "SQL Server",
    category: "Schema",
    tags: "primary key missing heap no key design hygiene unique",
    sql: `SELECT
    SCHEMA_NAME(t.schema_id) AS schema_name,
    t.name AS table_name,
    CASE WHEN EXISTS (SELECT 1 FROM sys.indexes AS i WHERE i.object_id = t.object_id AND i.type = 0) THEN 1 ELSE 0 END AS is_heap,
    CASE WHEN EXISTS (SELECT 1 FROM sys.indexes AS i WHERE i.object_id = t.object_id AND i.is_unique = 1) THEN 1 ELSE 0 END AS has_other_unique_index
FROM sys.tables AS t
WHERE t.is_ms_shipped = 0
  AND NOT EXISTS (
      SELECT 1 FROM sys.indexes AS i
      WHERE i.object_id = t.object_id AND i.is_primary_key = 1
  )
ORDER BY schema_name, table_name;`,
  },
  {
    title: "Identity columns nearing their limit",
    description:
      "Shows how much of each identity column's data-type range has been used. Catch int overflow before it becomes an outage.",
    database: "SQL Server",
    category: "Schema",
    tags: "identity overflow limit int bigint seed sequence capacity last value",
    sql: `SELECT
    SCHEMA_NAME(t.schema_id) AS schema_name,
    t.name AS table_name,
    c.name AS column_name,
    TYPE_NAME(c.user_type_id) AS data_type,
    CONVERT(bigint, c.last_value) AS last_value,
    CAST(100.0 * CONVERT(bigint, c.last_value) / m.max_value AS decimal(5, 2)) AS pct_used
FROM sys.identity_columns AS c
JOIN sys.tables AS t ON t.object_id = c.object_id
CROSS APPLY (
    SELECT CAST(CASE TYPE_NAME(c.user_type_id)
                    WHEN N'tinyint'  THEN 255
                    WHEN N'smallint' THEN 32767
                    WHEN N'int'      THEN 2147483647
                    WHEN N'bigint'   THEN 9223372036854775807
                END AS decimal(19, 0)) AS max_value
) AS m
WHERE c.last_value IS NOT NULL
  AND t.is_ms_shipped = 0
ORDER BY pct_used DESC;`,
  },

  // ───────────────────────────── Dependencies ─────────────────────────────
  {
    title: "Find text in procedures, views, functions and triggers",
    description:
      "Searches module definitions for a table, column or any text. Also finds names inside dynamic SQL strings. Matches are substrings (CustomerId also matches OldCustomerId) and include comments; encrypted modules cannot be searched.",
    database: "SQL Server",
    category: "Dependencies",
    tags: "reference references usage used by column table procedure view function trigger linkage search text definition where used",
    sql: `DECLARE @Search nvarchar(256) = N'CustomerId';
DECLARE @Like nvarchar(600) = N'%' + REPLACE(REPLACE(REPLACE(@Search, N'[', N'[[]'), N'%', N'[%]'), N'_', N'[_]') + N'%';

SELECT
    SCHEMA_NAME(o.schema_id) AS schema_name,
    o.name AS object_name,
    o.type_desc,
    p.name AS parent_table,          -- populated for triggers
    CHARINDEX(@Search, m.definition) AS first_match_position,
    o.modify_date
FROM sys.sql_modules AS m
JOIN sys.objects AS o ON o.object_id = m.object_id
LEFT JOIN sys.objects AS p ON p.object_id = o.parent_object_id
WHERE m.definition LIKE @Like
ORDER BY schema_name, object_name;`,
  },
  {
    title: "Object dependencies (both directions)",
    description:
      "What references this object, and what does it reference. Uses SQL Server's dependency metadata, so it is more precise than text search, but it does not track dynamic SQL or foreign keys (see the foreign-key pattern).",
    database: "SQL Server",
    category: "Dependencies",
    tags: "dependency dependencies depends referenced referencing impact analysis used by sp_depends before changing",
    sql: `DECLARE @Object nvarchar(776) = N'dbo.Orders';

SELECT DISTINCT
    N'Used by' AS direction,
    SCHEMA_NAME(o.schema_id) AS schema_name,
    o.name AS object_name,
    o.type_desc
FROM sys.sql_expression_dependencies AS d
JOIN sys.objects AS o ON o.object_id = d.referencing_id
WHERE d.referenced_id = OBJECT_ID(@Object)

UNION ALL

SELECT DISTINCT
    N'Depends on',
    d.referenced_schema_name,
    d.referenced_entity_name,
    COALESCE(ro.type_desc, N'cross-database or unresolved')
FROM sys.sql_expression_dependencies AS d
LEFT JOIN sys.objects AS ro ON ro.object_id = d.referenced_id
WHERE d.referencing_id = OBJECT_ID(@Object)

ORDER BY direction, schema_name, object_name;`,
  },

  // ───────────────────────────── Relationships ─────────────────────────────
  {
    title: "Show foreign-key relationships",
    description:
      "Every foreign key where the table is the child (references others) or the parent (is referenced), with mapped columns, cascade rules and trust state.",
    database: "SQL Server",
    category: "Relationships",
    tags: "foreign key fk relation relationship linkage parent child references cascade on delete",
    sql: `DECLARE @Table nvarchar(300) = N'dbo.Orders';

SELECT
    CASE WHEN fk.parent_object_id = fk.referenced_object_id THEN N'Self-reference'
         WHEN fk.parent_object_id = OBJECT_ID(@Table)       THEN N'This table references'
         ELSE N'Referenced by'
    END AS direction,
    fk.name AS foreign_key_name,
    QUOTENAME(SCHEMA_NAME(child.schema_id)) + N'.' + QUOTENAME(child.name) AS child_table,
    child_col.name AS child_column,
    QUOTENAME(SCHEMA_NAME(parent.schema_id)) + N'.' + QUOTENAME(parent.name) AS parent_table,
    parent_col.name AS parent_column,
    fk.delete_referential_action_desc AS on_delete,
    fk.update_referential_action_desc AS on_update,
    fk.is_disabled,
    fk.is_not_trusted
FROM sys.foreign_key_columns AS fkc
JOIN sys.foreign_keys AS fk ON fk.object_id = fkc.constraint_object_id
JOIN sys.tables AS child ON child.object_id = fkc.parent_object_id
JOIN sys.columns AS child_col ON child_col.object_id = fkc.parent_object_id AND child_col.column_id = fkc.parent_column_id
JOIN sys.tables AS parent ON parent.object_id = fkc.referenced_object_id
JOIN sys.columns AS parent_col ON parent_col.object_id = fkc.referenced_object_id AND parent_col.column_id = fkc.referenced_column_id
WHERE fkc.parent_object_id = OBJECT_ID(@Table)
   OR fkc.referenced_object_id = OBJECT_ID(@Table)
ORDER BY direction, fk.name, fkc.constraint_column_id;`,
  },
  {
    title: "Disabled or untrusted constraints",
    description:
      "Foreign keys and check constraints that are disabled or not trusted. Untrusted constraints let bad data in and stop the optimizer from using them. The generated script re-validates existing rows, so it can fail if bad data exists and may be slow on large tables.",
    database: "SQL Server",
    category: "Relationships",
    tags: "constraint disabled untrusted not trusted check foreign key nocheck with check validation optimizer",
    sql: `SELECT
    N'FOREIGN KEY' AS constraint_type,
    SCHEMA_NAME(fk.schema_id) AS schema_name,
    OBJECT_NAME(fk.parent_object_id) AS table_name,
    fk.name AS constraint_name,
    fk.is_disabled,
    fk.is_not_trusted,
    N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(fk.schema_id)) + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
        + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(fk.name) + N';' AS revalidate_script
FROM sys.foreign_keys AS fk
WHERE fk.is_disabled = 1 OR fk.is_not_trusted = 1

UNION ALL

SELECT
    N'CHECK',
    SCHEMA_NAME(cc.schema_id),
    OBJECT_NAME(cc.parent_object_id),
    cc.name,
    cc.is_disabled,
    cc.is_not_trusted,
    N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(cc.schema_id)) + N'.' + QUOTENAME(OBJECT_NAME(cc.parent_object_id))
        + N' WITH CHECK CHECK CONSTRAINT ' + QUOTENAME(cc.name) + N';'
FROM sys.check_constraints AS cc
WHERE cc.is_disabled = 1 OR cc.is_not_trusted = 1

ORDER BY schema_name, table_name, constraint_name;`,
  },

  // ───────────────────────────── Indexes ─────────────────────────────
  {
    title: "List indexes with keys, included columns and size",
    description:
      "All indexes on a table (including the heap) with ordered key columns, sort direction, included columns, filter, fill factor and size.",
    database: "SQL Server",
    category: "Indexes",
    tags: "index indexes keys included columns unique disabled table filtered size fill factor",
    sql: `DECLARE @Table nvarchar(300) = N'dbo.Orders';

SELECT
    i.index_id,
    i.name AS index_name,
    i.type_desc,
    i.is_unique,
    i.is_primary_key,
    i.is_disabled,
    i.fill_factor,
    i.filter_definition,
    k.key_columns,
    inc.included_columns,
    sz.size_mb
FROM sys.indexes AS i
OUTER APPLY (
    SELECT STRING_AGG(QUOTENAME(c.name) + CASE WHEN ic.is_descending_key = 1 THEN N' DESC' ELSE N'' END, N', ')
           WITHIN GROUP (ORDER BY ic.key_ordinal) AS key_columns
    FROM sys.index_columns AS ic
    JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id
      AND ic.is_included_column = 0 AND ic.key_ordinal > 0
) AS k
OUTER APPLY (
    SELECT STRING_AGG(QUOTENAME(c.name), N', ') WITHIN GROUP (ORDER BY c.column_id) AS included_columns
    FROM sys.index_columns AS ic
    JOIN sys.columns AS c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
) AS inc
OUTER APPLY (
    SELECT CAST(SUM(ps.used_page_count) * 8 / 1024.0 AS decimal(18, 2)) AS size_mb
    FROM sys.dm_db_partition_stats AS ps
    WHERE ps.object_id = i.object_id AND ps.index_id = i.index_id
) AS sz
WHERE i.object_id = OBJECT_ID(@Table)
ORDER BY i.index_id;`,
  },
  {
    title: "Index usage statistics",
    description:
      "Seeks, scans, lookups and updates per index. Counters reset when SQL Server restarts (the start time is shown), so judge them against uptime. Set @Table to NULL for all tables.",
    database: "SQL Server",
    category: "Indexes",
    tags: "index usage reads seeks scans lookups writes performance dm_db_index_usage_stats",
    sql: `DECLARE @Table nvarchar(300) = NULL;   -- e.g. N'dbo.Orders', or NULL for all tables

SELECT
    SCHEMA_NAME(o.schema_id) AS schema_name,
    o.name AS table_name,
    i.name AS index_name,
    i.type_desc,
    ISNULL(u.user_seeks, 0) AS seeks,
    ISNULL(u.user_scans, 0) AS scans,
    ISNULL(u.user_lookups, 0) AS lookups,
    ISNULL(u.user_updates, 0) AS updates,
    u.last_user_seek,
    u.last_user_scan,
    u.last_user_update,
    si.sqlserver_start_time AS stats_since
FROM sys.indexes AS i
JOIN sys.objects AS o ON o.object_id = i.object_id
CROSS JOIN sys.dm_os_sys_info AS si
LEFT JOIN sys.dm_db_index_usage_stats AS u
    ON u.database_id = DB_ID() AND u.object_id = i.object_id AND u.index_id = i.index_id
WHERE o.type = N'U'
  AND o.is_ms_shipped = 0
  AND i.index_id > 0
  AND (@Table IS NULL OR o.object_id = OBJECT_ID(@Table))
ORDER BY ISNULL(u.user_seeks, 0) + ISNULL(u.user_scans, 0) + ISNULL(u.user_lookups, 0) DESC;`,
  },
  {
    title: "Find possibly unused indexes",
    description:
      "Non-unique nonclustered indexes with no recorded reads since the last restart, biggest write cost first. Primary keys, unique constraints and unique indexes are excluded because they enforce rules. Check uptime and monthly or quarterly jobs before dropping anything.",
    database: "SQL Server",
    category: "Indexes",
    tags: "unused index write update delete drop performance cleanup redundant",
    sql: `SELECT
    SCHEMA_NAME(o.schema_id) AS schema_name,
    o.name AS table_name,
    i.name AS index_name,
    ISNULL(u.user_updates, 0) AS user_updates,
    sz.size_mb,
    si.sqlserver_start_time AS stats_since
FROM sys.indexes AS i
JOIN sys.objects AS o ON o.object_id = i.object_id
CROSS JOIN sys.dm_os_sys_info AS si
LEFT JOIN sys.dm_db_index_usage_stats AS u
    ON u.database_id = DB_ID() AND u.object_id = i.object_id AND u.index_id = i.index_id
OUTER APPLY (
    SELECT CAST(SUM(ps.used_page_count) * 8 / 1024.0 AS decimal(18, 2)) AS size_mb
    FROM sys.dm_db_partition_stats AS ps
    WHERE ps.object_id = i.object_id AND ps.index_id = i.index_id
) AS sz
WHERE o.type = N'U'
  AND o.is_ms_shipped = 0
  AND i.type = 2                         -- nonclustered rowstore
  AND i.is_primary_key = 0
  AND i.is_unique = 0
  AND i.is_unique_constraint = 0
  AND i.is_disabled = 0
  AND ISNULL(u.user_seeks, 0) + ISNULL(u.user_scans, 0) + ISNULL(u.user_lookups, 0) = 0
ORDER BY user_updates DESC, sz.size_mb DESC;`,
  },
  {
    title: "Foreign keys without a supporting index",
    description:
      "Foreign keys whose columns are not the leading key columns of any enabled, unfiltered index. Handles composite keys correctly. Unindexed foreign keys slow joins and cause table scans (and blocking) on parent deletes. Includes row count and a draft CREATE INDEX.",
    database: "SQL Server",
    category: "Indexes",
    tags: "foreign key index performance join delete missing index composite blocking",
    sql: `SELECT
    SCHEMA_NAME(t.schema_id) AS schema_name,
    t.name AS table_name,
    fk.name AS foreign_key_name,
    f.column_list AS foreign_key_columns,
    (SELECT SUM(ps.row_count) FROM sys.dm_db_partition_stats AS ps
     WHERE ps.object_id = t.object_id AND ps.index_id IN (0, 1)) AS row_count,
    N'CREATE NONCLUSTERED INDEX ' + QUOTENAME(N'IX_' + t.name + N'_' + REPLACE(f.column_list, N', ', N'_'))
        + N' ON ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + N'.' + QUOTENAME(t.name)
        + N' (' + f.quoted_list + N');' AS draft_create_index
FROM sys.foreign_keys AS fk
JOIN sys.tables AS t ON t.object_id = fk.parent_object_id
CROSS APPLY (
    SELECT COUNT(*) AS col_count,
           STRING_AGG(c.name, N', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS column_list,
           STRING_AGG(QUOTENAME(c.name), N', ') WITHIN GROUP (ORDER BY fkc.constraint_column_id) AS quoted_list
    FROM sys.foreign_key_columns AS fkc
    JOIN sys.columns AS c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
    WHERE fkc.constraint_object_id = fk.object_id
) AS f
WHERE NOT EXISTS (
    SELECT 1
    FROM sys.indexes AS i
    WHERE i.object_id = fk.parent_object_id
      AND i.index_id > 0
      AND i.is_disabled = 0
      AND i.has_filter = 0
      AND f.col_count = (
          SELECT COUNT(*)
          FROM sys.foreign_key_columns AS fkc2
          JOIN sys.index_columns AS ic
            ON ic.object_id = fkc2.parent_object_id
           AND ic.index_id = i.index_id
           AND ic.column_id = fkc2.parent_column_id
           AND ic.is_included_column = 0
           AND ic.key_ordinal BETWEEN 1 AND f.col_count
          WHERE fkc2.constraint_object_id = fk.object_id
      )
)
ORDER BY row_count DESC, schema_name, table_name;`,
  },
  {
    title: "Missing index suggestions (from the optimizer)",
    description:
      "Top missing-index suggestions ranked by estimated benefit. These are hints, not instructions: they ignore existing indexes, overlap each other and reset on restart. Merge and sanity-check before creating anything.",
    database: "SQL Server",
    category: "Indexes",
    tags: "missing index suggestion tuning dmv performance recommendation impact",
    sql: `SELECT TOP (25)
    mid.statement AS table_name,
    migs.avg_total_user_cost * migs.avg_user_impact * (migs.user_seeks + migs.user_scans) AS improvement_measure,
    migs.user_seeks,
    migs.user_scans,
    migs.avg_user_impact AS avg_pct_improvement,
    mid.equality_columns,
    mid.inequality_columns,
    mid.included_columns
FROM sys.dm_db_missing_index_group_stats AS migs
JOIN sys.dm_db_missing_index_groups AS mig ON mig.index_group_handle = migs.group_handle
JOIN sys.dm_db_missing_index_details AS mid ON mid.index_handle = mig.index_handle
WHERE mid.database_id = DB_ID()
ORDER BY improvement_measure DESC;`,
  },

  // ───────────────────────────── Data quality ─────────────────────────────
  {
    title: "Find orphaned foreign-key rows",
    description:
      'Child rows whose parent does not exist. Only possible when the foreign key is missing, disabled or untrusted. NULL foreign-key values are ignored because they are legitimately "no parent".',
    database: "SQL Server / PostgreSQL / MySQL",
    category: "Data quality",
    tags: "orphan missing parent foreign key integrity validation not exists",
    sql: `SELECT child.*
FROM OrderItems AS child
WHERE child.OrderId IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM Orders AS parent
      WHERE parent.Id = child.OrderId
  );`,
  },
  {
    title: "Find duplicate business values",
    description:
      "Values that should be unique but are not, ignoring NULLs and surrounding spaces. Add more columns to GROUP BY to scope the check (for example per tenant).",
    database: "SQL Server / PostgreSQL / MySQL",
    category: "Data quality",
    tags: "duplicate duplicates unique constraint group having email scope tenant",
    sql: `SELECT
    TenantId,                                   -- remove if the value must be globally unique
    LTRIM(RTRIM(Email)) AS email_normalized,
    COUNT(*) AS duplicate_count,
    MIN(Id) AS first_id,
    MAX(Id) AS last_id
FROM Users
WHERE Email IS NOT NULL
GROUP BY TenantId, LTRIM(RTRIM(Email))
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, email_normalized;`,
  },
  {
    title: "List every row in a duplicate set",
    description:
      "Shows the full rows behind each duplicate so you can compare them before deciding what to keep.",
    database: "SQL Server / PostgreSQL",
    category: "Data quality",
    tags: "duplicate rows compare window count partition review merge",
    sql: `WITH dupes AS (
    SELECT
        u.*,
        COUNT(*) OVER (PARTITION BY TenantId, LTRIM(RTRIM(Email))) AS duplicate_count
    FROM Users AS u
    WHERE u.Email IS NOT NULL
)
SELECT *
FROM dupes
WHERE duplicate_count > 1
ORDER BY TenantId, LTRIM(RTRIM(Email)), Id;`,
  },
  {
    title: "Reference or lookup data",
    description:
      "Distinct values with counts and share of total for a status, type or code column. NULL appears as its own group, which makes missing values obvious.",
    database: "SQL Server / PostgreSQL / MySQL 8+",
    category: "Reference data",
    tags: "reference lookup enum status type distinct values codes distribution percentage",
    sql: `SELECT
    Status,
    COUNT(*) AS row_count,
    CAST(100.0 * COUNT(*) / SUM(COUNT(*)) OVER () AS decimal(5, 2)) AS pct_of_total
FROM Orders
GROUP BY Status
ORDER BY row_count DESC, Status;`,
  },
  {
    title: "Find rows missing required values",
    description:
      "Summary of NULL and blank values for a column, followed by the affected rows. Note that TRIM only removes spaces, not tabs or line breaks.",
    database: "SQL Server / PostgreSQL / MySQL",
    category: "Data quality",
    tags: "null empty blank required missing validation data quality fill rate",
    sql: `-- 1) How bad is it?
SELECT
    COUNT(*) AS total_rows,
    SUM(CASE WHEN Email IS NULL THEN 1 ELSE 0 END) AS null_count,
    SUM(CASE WHEN Email IS NOT NULL AND LTRIM(RTRIM(Email)) = '' THEN 1 ELSE 0 END) AS blank_count
FROM Customers;

-- 2) Which rows?
SELECT Id, Email
FROM Customers
WHERE NULLIF(LTRIM(RTRIM(Email)), '') IS NULL;`,
  },
  {
    title: "Find missing records (parents without children)",
    description:
      "Parent rows with no matching child. NOT EXISTS is used instead of NOT IN because NOT IN returns nothing if the subquery contains a NULL.",
    database: "SQL Server / PostgreSQL / MySQL",
    category: "Data quality",
    tags: "missing no children anti join left join not exists customers without orders",
    sql: `SELECT c.*
FROM Customers AS c
WHERE NOT EXISTS (
    SELECT 1
    FROM Orders AS o
    WHERE o.CustomerId = c.Id
);`,
  },

  // ───────────────────────────── Window functions and paging ─────────────────────────────
  {
    title: "Latest record per group",
    description:
      "Newest row per customer (or any partition). Best when you need most rows. When driving from a small parent table, the APPLY version below is usually faster with an index on (CustomerId, CreatedAt DESC, Id DESC).",
    database: "SQL Server / PostgreSQL",
    category: "Window functions",
    tags: "latest newest last row per group customer row_number window top 1 apply",
    sql: `WITH ranked AS (
    SELECT
        o.*,
        ROW_NUMBER() OVER (PARTITION BY o.CustomerId ORDER BY o.CreatedAt DESC, o.Id DESC) AS rn
    FROM Orders AS o
)
SELECT *
FROM ranked
WHERE rn = 1;

/* Alternative (SQL Server): often faster when starting from a smaller Customers table
SELECT c.Id AS CustomerId, latest.*
FROM Customers AS c
CROSS APPLY (
    SELECT TOP (1) o.*
    FROM Orders AS o
    WHERE o.CustomerId = c.Id
    ORDER BY o.CreatedAt DESC, o.Id DESC
) AS latest;
*/`,
  },
  {
    title: "Keyset pagination",
    description:
      'Fast "next page" queries that stay fast on deep pages, unlike OFFSET. Pass the last row\'s sort values from the previous page. Needs an index on (CreatedAt DESC, Id DESC).',
    database: "SQL Server",
    category: "Paging",
    tags: "paging pagination keyset seek offset fetch next page cursor infinite scroll",
    sql: `DECLARE @PageSize int = 50;
DECLARE @LastCreatedAt datetime2 = NULL;   -- CreatedAt of the last row on the previous page (NULL = first page)
DECLARE @LastId int = NULL;                -- Id of the last row on the previous page

SELECT TOP (@PageSize)
    Id, CreatedAt, Status
FROM Orders
WHERE @LastCreatedAt IS NULL
   OR CreatedAt < @LastCreatedAt
   OR (CreatedAt = @LastCreatedAt AND Id < @LastId)
ORDER BY CreatedAt DESC, Id DESC
OPTION (RECOMPILE);`,
  },

  // ───────────────────────────── Write operations ─────────────────────────────
  {
    title: "Safe upsert (update, else insert)",
    description:
      "Concurrency-safe update-or-insert. The UPDLOCK and SERIALIZABLE hints stop two sessions from both inserting the same key. Uses TRY/CATCH so a failure never leaves a transaction open. Avoids MERGE, which has a history of bugs.",
    database: "SQL Server",
    category: "Write operations",
    tags: "upsert insert update merge transaction concurrency race condition serializable updlock",
    sql: `DECLARE @Id int = 1, @DisplayName nvarchar(100) = N'Example';   -- usually procedure parameters

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE Users WITH (UPDLOCK, SERIALIZABLE)
    SET DisplayName = @DisplayName
    WHERE Id = @Id;

    IF @@ROWCOUNT = 0
        INSERT INTO Users (Id, DisplayName)
        VALUES (@Id, @DisplayName);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;`,
  },
  {
    title: "Preview a change with OUTPUT, then roll back",
    description:
      "Run an UPDATE inside a transaction and see exactly which rows change (old and new values) before committing. Tables with enabled triggers need OUTPUT ... INTO a table variable instead. Do not leave the window open after running, or locks stay held.",
    database: "SQL Server",
    category: "Write operations",
    tags: "preview dry run output update rollback transaction safe test change before after",
    sql: `BEGIN TRANSACTION;

UPDATE Orders
SET Status = N'Closed'
OUTPUT
    deleted.Id,
    deleted.Status AS old_status,
    inserted.Status AS new_status
WHERE CreatedAt < '20200101'
  AND Status <> N'Closed';

SELECT @@ROWCOUNT AS rows_affected;

ROLLBACK TRANSACTION;   -- change to COMMIT TRANSACTION once the output looks right`,
  },
  {
    title: "Delete in batches",
    description:
      "Deletes a large number of rows in small chunks to avoid huge log growth, long blocking and lock escalation (which starts around 5,000 locks). Each batch commits on its own, so the whole job cannot be rolled back. Needs an index on the filter column.",
    database: "SQL Server",
    category: "Write operations",
    tags: "delete batch purge archive cleanup large table log lock escalation chunk loop",
    sql: `DECLARE @BatchSize int = 4000;
DECLARE @Cutoff datetime2 = DATEADD(YEAR, -2, SYSDATETIME());
DECLARE @Rows int = 1;

WHILE @Rows > 0
BEGIN
    DELETE TOP (@BatchSize)
    FROM AuditLog
    WHERE CreatedAt < @Cutoff;

    SET @Rows = @@ROWCOUNT;

    -- WAITFOR DELAY '00:00:01';   -- optional: give log backups and other sessions room to breathe
END;`,
  },
  {
    title: "Delete duplicates, keep the newest",
    description:
      "Ranks rows within each duplicate set and removes all but the newest. Run the preview first. A CTE only lasts for one statement, so swap the SELECT for the DELETE rather than running both. Wrap in a transaction and check the row count.",
    database: "SQL Server",
    category: "Write operations",
    tags: "delete duplicates dedupe remove keep newest row_number cte cleanup",
    sql: `-- Step 1: preview what would be deleted (rn > 1)
WITH ranked AS (
    SELECT
        u.*,
        ROW_NUMBER() OVER (PARTITION BY TenantId, Email ORDER BY CreatedAt DESC, Id DESC) AS rn
    FROM Users AS u
)
SELECT *
FROM ranked
WHERE rn > 1;

-- Step 2: replace the SELECT above with this DELETE (keep the CTE definition)
-- DELETE FROM ranked WHERE rn > 1;`,
  },

  // ───────────────────────────── Diagnostics ─────────────────────────────
  {
    title: "Currently running requests",
    description:
      "What is executing right now: the exact statement, elapsed time, CPU, reads, waits and who is blocking. A lightweight stand-in for sp_who2 or sp_WhoIsActive.",
    database: "SQL Server",
    category: "Diagnostics",
    tags: "running active requests sessions sp_who2 whoisactive current queries cpu reads wait slow",
    sql: `SELECT
    r.session_id,
    s.login_name,
    s.host_name,
    s.program_name,
    DB_NAME(r.database_id) AS database_name,
    r.status,
    r.command,
    r.wait_type,
    r.wait_time,
    r.blocking_session_id,
    r.cpu_time,
    r.logical_reads,
    r.total_elapsed_time / 1000 AS elapsed_sec,
    ${currentStatement("r", "t")} AS current_statement
FROM sys.dm_exec_requests AS r
JOIN sys.dm_exec_sessions AS s ON s.session_id = r.session_id
OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
WHERE s.is_user_process = 1
  AND r.session_id <> @@SPID
ORDER BY r.total_elapsed_time DESC;`,
  },
  {
    title: "Blocking: who is blocking whom",
    description:
      'Each blocked request with its blocker\'s login, status, open transaction count and last batch. A blocker that is "sleeping" with open transactions is usually a forgotten COMMIT or ROLLBACK. Replaces the old locks query, which only showed the blocked side and the whole batch text.',
    database: "SQL Server",
    category: "Diagnostics",
    tags: "blocking locks blocked sessions blocker wait deadlock troubleshooting head blocker open transaction",
    sql: `SELECT
    r.session_id AS blocked_session,
    r.blocking_session_id AS blocker_session,
    r.wait_type,
    r.wait_time / 1000 AS wait_sec,
    r.wait_resource,
    DB_NAME(r.database_id) AS database_name,
    ${currentStatement("r", "t")} AS blocked_statement,
    bs.login_name AS blocker_login,
    bs.host_name AS blocker_host,
    bs.status AS blocker_status,
    bs.open_transaction_count AS blocker_open_transactions,
    bt.text AS blocker_last_batch
FROM sys.dm_exec_requests AS r
JOIN sys.dm_exec_sessions AS bs ON bs.session_id = r.blocking_session_id
LEFT JOIN sys.dm_exec_connections AS bc ON bc.session_id = r.blocking_session_id
OUTER APPLY sys.dm_exec_sql_text(r.sql_handle) AS t
OUTER APPLY sys.dm_exec_sql_text(bc.most_recent_sql_handle) AS bt
WHERE r.blocking_session_id > 0
ORDER BY r.wait_time DESC;`,
  },
  {
    title: "Open transactions",
    description:
      'Sessions holding a transaction open, oldest first, with the last batch they ran. Finds the "I forgot to COMMIT" window that blocks everyone else.',
    database: "SQL Server",
    category: "Diagnostics",
    tags: "open transaction uncommitted forgotten commit rollback trancount long running dbcc opentran locks",
    sql: `SELECT
    s.session_id,
    s.login_name,
    s.host_name,
    s.program_name,
    s.status,
    s.open_transaction_count,
    tx.transaction_begin_time,
    DATEDIFF(SECOND, tx.transaction_begin_time, GETDATE()) AS open_sec,
    lb.text AS last_batch
FROM sys.dm_tran_session_transactions AS st
JOIN sys.dm_tran_active_transactions AS tx ON tx.transaction_id = st.transaction_id
JOIN sys.dm_exec_sessions AS s ON s.session_id = st.session_id
LEFT JOIN sys.dm_exec_connections AS c ON c.session_id = s.session_id
OUTER APPLY sys.dm_exec_sql_text(c.most_recent_sql_handle) AS lb
WHERE s.is_user_process = 1
ORDER BY tx.transaction_begin_time;`,
  },
  {
    title: "Top queries by CPU (plan cache)",
    description:
      "Most expensive cached statements with averages per execution and a clickable plan. Based on the plan cache, so it only covers queries still cached since the last restart or cache clear. For history across restarts use Query Store.",
    database: "SQL Server",
    category: "Diagnostics",
    tags: "top queries expensive cpu reads slow plan cache query stats performance tuning",
    sql: `SELECT TOP (25)
    qs.execution_count,
    qs.total_worker_time / 1000 AS total_cpu_ms,
    qs.total_worker_time / qs.execution_count / 1000 AS avg_cpu_ms,
    qs.total_logical_reads / qs.execution_count AS avg_logical_reads,
    qs.total_elapsed_time / qs.execution_count / 1000 AS avg_elapsed_ms,
    qs.last_execution_time,
    DB_NAME(st.dbid) AS database_name,       -- NULL for ad hoc batches
    ${currentStatement("qs", "st")} AS statement_text,
    qp.query_plan
FROM sys.dm_exec_query_stats AS qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) AS st
OUTER APPLY sys.dm_exec_query_plan(qs.plan_handle) AS qp
ORDER BY qs.total_worker_time DESC;`,
  },
];
