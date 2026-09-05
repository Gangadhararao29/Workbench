import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CodeEditor } from '../../../shared/code-editor/code-editor';
import { InstanceService } from '../../../core/tool/tool-instance';

type LinqViewMode = 'patterns' | 'cheatsheet';
type PatternType = 'eager-loading' | 'split-query' | 'batch-operations' | 'pagination' | 'groupby' | 'raw-sql' | 'soft-delete' | 'explicit-loading';

interface SqlLinqCard {
  title: string;
  category: string;
  sql: string;
  linqMethod: string;
  linqQuery: string;
  notes: string;
}

const SQL_LINQ_CARDS: SqlLinqCard[] = [
  {
    title: 'Basic Filter & Projection (SELECT ... WHERE ... ORDER BY)',
    category: 'Filtering',
    sql: 'SELECT Id, FirstName, Email\nFROM Customers\nWHERE IsActive = 1 AND CreditLimit > 1000\nORDER BY LastName ASC, FirstName ASC;',
    linqMethod: 'var result = await context.Customers\n    .Where(c => c.IsActive && c.CreditLimit > 1000)\n    .OrderBy(c => c.LastName)\n    .ThenBy(c => c.FirstName)\n    .Select(c => new CustomerDto(\n        c.Id,\n        c.FirstName,\n        c.Email\n    ))\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from c in context.Customers\n                    where c.IsActive && c.CreditLimit > 1000\n                    orderby c.LastName, c.FirstName\n                    select new CustomerDto(c.Id, c.FirstName, c.Email))\n                    .ToListAsync(cancellationToken);',
    notes: 'Always project to DTOs using .Select() to avoid fetching unnecessary columns from the database.'
  },
  {
    title: 'Inner Join (JOIN ... ON)',
    category: 'Joins',
    sql: 'SELECT c.FirstName, o.OrderNumber, o.TotalAmount\nFROM Customers c\nINNER JOIN Orders o ON c.Id = o.CustomerId\nWHERE o.TotalAmount > 500;',
    linqMethod: '// With Navigation Properties (Preferred in EF Core):\nvar result = await context.Orders\n    .Where(o => o.TotalAmount > 500)\n    .Select(o => new {\n        o.Customer.FirstName,\n        o.OrderNumber,\n        o.TotalAmount\n    })\n    .ToListAsync(cancellationToken);\n\n// Explicit Join (if no navigation):\nvar explicitJoin = await context.Customers\n    .Join(context.Orders,\n          c => c.Id,\n          o => o.CustomerId,\n          (c, o) => new { c.FirstName, o.OrderNumber, o.TotalAmount })\n    .Where(x => x.TotalAmount > 500)\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from c in context.Customers\n                    join o in context.Orders on c.Id equals o.CustomerId\n                    where o.TotalAmount > 500\n                    select new { c.FirstName, o.OrderNumber, o.TotalAmount })\n                    .ToListAsync(cancellationToken);',
    notes: 'In EF Core, navigation properties automatically generate optimal SQL joins without needing explicit .Join().'
  },
  {
    title: 'Left Outer Join (LEFT JOIN ... ON)',
    category: 'Joins',
    sql: 'SELECT c.FirstName, o.OrderNumber\nFROM Customers c\nLEFT JOIN Orders o ON c.Id = o.CustomerId;',
    linqMethod: 'var result = await context.Customers\n    .GroupJoin(\n        context.Orders,\n        c => c.Id,\n        o => o.CustomerId,\n        (c, orders) => new { Customer = c, Orders = orders }\n    )\n    .SelectMany(\n        x => x.Orders.DefaultIfEmpty(),\n        (x, order) => new {\n            x.Customer.FirstName,\n            OrderNumber = order != null ? order.OrderNumber : null\n        }\n    )\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from c in context.Customers\n                    join o in context.Orders on c.Id equals o.CustomerId into gj\n                    from subOrder in gj.DefaultIfEmpty()\n                    select new {\n                        c.FirstName,\n                        OrderNumber = subOrder != null ? subOrder.OrderNumber : null\n                    }).ToListAsync(cancellationToken);',
    notes: 'DefaultIfEmpty() is the LINQ equivalent to SQL LEFT JOIN.'
  },
  {
    title: 'IN Clause (WHERE Col IN (...))',
    category: 'Filtering',
    sql: 'SELECT * FROM Orders\nWHERE StatusId IN (1, 2, 4);',
    linqMethod: 'var targetStatuses = new[] { 1, 2, 4 };\nvar result = await context.Orders\n    .Where(o => targetStatuses.Contains(o.StatusId))\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var targetStatuses = new[] { 1, 2, 4 };\nvar result = await (from o in context.Orders\n                    where targetStatuses.Contains(o.StatusId)\n                    select o)\n                    .ToListAsync(cancellationToken);',
    notes: 'Passing an array or List to .Contains() translates directly to a SQL IN (...) predicate.'
  },
  {
    title: 'EXISTS / NOT EXISTS (Correlated Subquery)',
    category: 'Subqueries',
    sql: 'SELECT c.Id, c.FirstName\nFROM Customers c\nWHERE EXISTS (\n    SELECT 1 FROM Orders o\n    WHERE o.CustomerId = c.Id AND o.TotalAmount > 1000\n);',
    linqMethod: 'var result = await context.Customers\n    .Where(c => c.Orders.Any(o => o.TotalAmount > 1000))\n    .Select(c => new { c.Id, c.FirstName })\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from c in context.Customers\n                    where c.Orders.Any(o => o.TotalAmount > 1000)\n                    select new { c.Id, c.FirstName })\n                    .ToListAsync(cancellationToken);',
    notes: '.Any(...) on a navigation collection produces SQL EXISTS (SELECT 1 ...).'
  },
  {
    title: 'GROUP BY & Aggregations (HAVING COUNT(*) > 5)',
    category: 'Aggregation',
    sql: 'SELECT CustomerId, COUNT(*) AS TotalOrders, SUM(TotalAmount) AS GrandTotal\nFROM Orders\nGROUP BY CustomerId\nHAVING COUNT(*) > 5;',
    linqMethod: 'var result = await context.Orders\n    .GroupBy(o => o.CustomerId)\n    .Where(g => g.Count() > 5)\n    .Select(g => new {\n        CustomerId = g.Key,\n        TotalOrders = g.Count(),\n        GrandTotal = g.Sum(o => o.TotalAmount)\n    })\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from o in context.Orders\n                    group o by o.CustomerId into g\n                    where g.Count() > 5\n                    select new {\n                        CustomerId = g.Key,\n                        TotalOrders = g.Count(),\n                        GrandTotal = g.Sum(x => x.TotalAmount)\n                    }).ToListAsync(cancellationToken);',
    notes: '.Where() placed after .GroupBy() translates to the SQL HAVING clause.'
  },
  {
    title: 'LIKE Pattern Matching & Full Text Search',
    category: 'Filtering',
    sql: "SELECT * FROM Products\nWHERE Name LIKE '%phone%' OR Code LIKE 'PRD_%';",
    linqMethod: 'var result = await context.Products\n    .Where(p => EF.Functions.Like(p.Name, "%phone%") || EF.Functions.Like(p.Code, "PRD_%"))\n    .ToListAsync(cancellationToken);\n\n// Or standard string methods (starts with, contains):\nvar standard = await context.Products\n    .Where(p => p.Name.Contains("phone") || p.Code.StartsWith("PRD_"))\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from p in context.Products\n                    where EF.Functions.Like(p.Name, "%phone%")\n                    select p).ToListAsync(cancellationToken);',
    notes: 'EF.Functions.Like supports standard SQL wildcard operators % and _.'
  },
  {
    title: 'Pagination (OFFSET ... FETCH NEXT ... ROWS ONLY)',
    category: 'Pagination',
    sql: 'SELECT * FROM Customers\nORDER BY CreatedAtUtc DESC\nOFFSET 20 ROWS\nFETCH NEXT 10 ROWS ONLY;',
    linqMethod: 'int page = 3;\nint pageSize = 10;\n\nvar result = await context.Customers\n    .OrderByDescending(c => c.CreatedAtUtc)\n    .Skip((page - 1) * pageSize)\n    .Take(pageSize)\n    .ToListAsync(cancellationToken);',
    linqQuery: 'int page = 3;\nint pageSize = 10;\n\nvar result = await (from c in context.Customers\n                    orderby c.CreatedAtUtc descending\n                    select c)\n                    .Skip((page - 1) * pageSize)\n                    .Take(pageSize)\n                    .ToListAsync(cancellationToken);',
    notes: 'Always specify an OrderBy before Skip/Take for deterministic SQL pagination.'
  },
  {
    title: 'Conditional CASE WHEN ... THEN ... ELSE',
    category: 'Expressions',
    sql: "SELECT OrderNumber,\n       CASE\n           WHEN TotalAmount > 1000 THEN 'VIP'\n           WHEN TotalAmount > 500 THEN 'Gold'\n           ELSE 'Standard'\n       END AS CustomerTier\nFROM Orders;",
    linqMethod: 'var result = await context.Orders\n    .Select(o => new {\n        o.OrderNumber,\n        Tier = o.TotalAmount > 1000 ? "VIP" :\n               o.TotalAmount > 500 ? "Gold" : "Standard"\n    })\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from o in context.Orders\n                    select new {\n                        o.OrderNumber,\n                        Tier = o.TotalAmount > 1000 ? "VIP" :\n                               o.TotalAmount > 500 ? "Gold" : "Standard"\n                    }).ToListAsync(cancellationToken);',
    notes: 'Ternary conditions ? : in C# project directly to SQL CASE WHEN expressions.'
  },
  {
    title: 'CROSS APPLY / OUTER APPLY (Correlated Tables)',
    category: 'Advanced',
    sql: 'SELECT c.FirstName, latestOrder.OrderNumber\nFROM Customers c\nCROSS APPLY (\n    SELECT TOP 1 OrderNumber, OrderDate\n    FROM Orders o\n    WHERE o.CustomerId = c.Id\n    ORDER BY OrderDate DESC\n) latestOrder;',
    linqMethod: 'var result = await context.Customers\n    .SelectMany(\n        c => context.Orders\n            .Where(o => o.CustomerId == c.Id)\n            .OrderByDescending(o => o.OrderDate)\n            .Take(1),\n        (c, o) => new { c.FirstName, o.OrderNumber }\n    )\n    .ToListAsync(cancellationToken);',
    linqQuery: 'var result = await (from c in context.Customers\n                    from o in context.Orders\n                                .Where(x => x.CustomerId == c.Id)\n                                .OrderByDescending(x => x.OrderDate)\n                                .Take(1)\n                    select new { c.FirstName, o.OrderNumber })\n                    .ToListAsync(cancellationToken);',
    notes: '.SelectMany() translates to SQL CROSS APPLY or OUTER APPLY.'
  }
];

@Component({
  selector: 'app-ef-linq',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatSlideToggleModule,
    CodeEditor
  ],
  templateUrl: './ef-linq.html',
  styleUrls: ['./ef-linq.css']
})
export class EfLinq implements OnInit {
  @Input({ required: true }) instanceId!: string;

  viewMode = signal<LinqViewMode>('patterns');
  activePattern = signal<PatternType>('eager-loading');
  syntaxStyle = signal<'method' | 'query'>('method');

  // Generator Options
  entityName = 'Customer';
  contextVar = 'context';
  asNoTracking = true;
  useCancellationToken = true;
  useTagWith = true;
  tagText = 'GetActiveCustomersWithOrders';
  wrapInHandler = false;

  // Pattern Specific Inputs
  includeNavigation = 'Orders';
  thenIncludeNav = 'OrderItems';
  filteredIncludeCondition = 'o.TotalAmount > 100';
  batchUpdateSet = 'c.Status = CustomerStatus.Active, c.UpdatedAtUtc = DateTime.UtcNow';
  batchCondition = 'c.Status == CustomerStatus.Pending && c.CreatedAtUtc < cutoffDate';
  pageNumber = 1;
  pageSize = 20;

  // Search in cheatsheet
  searchFilter = signal('');

  result = signal('');

  cards = SQL_LINQ_CARDS;

  filteredCards = computed(() => {
    const q = this.searchFilter().toLowerCase().trim();
    if (!q) return this.cards;
    return this.cards.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.sql.toLowerCase().includes(q) ||
      c.notes.toLowerCase().includes(q)
    );
  });

  constructor(private instanceService: InstanceService) {
    effect(() => {
      this.config();
      this.generate();
    });
  }

  config = computed(() =>
    this.instanceService.instances().find(i => i.id === this.instanceId)?.config ?? {}
  );

  ngOnInit() {
    this.generate();
  }

  setViewMode(mode: LinqViewMode) {
    this.viewMode.set(mode);
    if (mode === 'patterns') {
      this.generate();
    }
  }

  setPattern(pattern: PatternType) {
    this.activePattern.set(pattern);
    this.generate();
  }

  setSyntax(syntax: 'method' | 'query') {
    this.syntaxStyle.set(syntax);
    this.generate();
  }

  generate() {
    if (this.viewMode() !== 'patterns') return;

    const pattern = this.activePattern();
    const syntax = this.syntaxStyle();
    const ctx = this.contextVar.trim() || 'context';
    const entity = this.entityName.trim() || 'Customer';
    const ct = this.useCancellationToken ? 'cancellationToken' : '';
    const tag = this.useTagWith && this.tagText.trim() ? `.TagWith("${this.tagText.trim()}")` : '';
    const noTrack = this.asNoTracking ? '.AsNoTracking()' : '';

    const lines: string[] = [];

    switch (pattern) {
      case 'eager-loading': {
        lines.push('// 1. Eager loading with .Include() and filtered include:');
        if (syntax === 'method') {
          lines.push(`var query = ${ctx}.${entity}s`);
          if (tag) lines.push(`    ${tag}`);
          if (noTrack) lines.push(`    ${noTrack}`);
          lines.push(`    .Include(c => c.${this.includeNavigation.trim() || 'Orders'}.Where(o => ${this.filteredIncludeCondition.trim() || 'true'}))`);
          if (this.thenIncludeNav.trim()) {
            lines.push(`        .ThenInclude(o => o.${this.thenIncludeNav.trim()})`);
          }
          lines.push(`    .Where(c => c.IsActive);`);
          lines.push('');
          lines.push(`var result = await query.ToListAsync(${ct});`);
        } else {
          lines.push(`var query = (from c in ${ctx}.${entity}s${noTrack ? ' /* Note: Call AsNoTracking() on dbSet */' : ''}`);
          lines.push(`             where c.IsActive`);
          lines.push(`             select c)`);
          lines.push(`            .Include(c => c.${this.includeNavigation.trim() || 'Orders'})`);
          if (this.thenIncludeNav.trim()) {
            lines.push(`            .ThenInclude(o => o.${this.thenIncludeNav.trim()})`);
          }
          lines.push(`            .ToListAsync(${ct});`);
        }
        break;
      }

      case 'split-query': {
        lines.push('// AsSplitQuery avoids Cartesian product explosion when including multiple 1:N collections:');
        lines.push(`var customers = await ${ctx}.${entity}s`);
        if (tag) lines.push(`    ${tag}`);
        if (noTrack) lines.push(`    ${noTrack}`);
        lines.push(`    .AsSplitQuery()`);
        lines.push(`    .Include(c => c.Orders)`);
        lines.push(`    .Include(c => c.Addresses)`);
        lines.push(`    .Include(c => c.AuditLogs)`);
        lines.push(`    .Where(c => c.IsActive)`);
        lines.push(`    .ToListAsync(${ct});`);
        break;
      }

      case 'batch-operations': {
        lines.push('// EF Core 7+ ExecuteUpdateAsync & ExecuteDeleteAsync (Set-based, bypasses change tracker):');
        lines.push('');
        lines.push('// --- BATCH UPDATE ---');
        lines.push(`var updatedCount = await ${ctx}.${entity}s`);
        if (tag) lines.push(`    ${tag}`);
        lines.push(`    .Where(c => ${this.batchCondition.trim() || 'c.IsActive == false'})`);
        lines.push(`    .ExecuteUpdateAsync(setters => setters`);
        lines.push(`        .SetProperty(c => c.Status, CustomerStatus.Active)`);
        lines.push(`        .SetProperty(c => c.UpdatedAtUtc, DateTime.UtcNow),`);
        lines.push(`        ${ct || 'cancellationToken'});`);
        lines.push('');
        lines.push('// --- BATCH DELETE ---');
        lines.push(`var deletedCount = await ${ctx}.${entity}s`);
        lines.push(`    .Where(c => c.IsDeleted && c.DeletedAtUtc < DateTime.UtcNow.AddYears(-1))`);
        lines.push(`    .ExecuteDeleteAsync(${ct || 'cancellationToken'});`);
        break;
      }

      case 'pagination': {
        lines.push('// Paged query with total count & projected DTO:');
        lines.push(`int page = ${this.pageNumber};`);
        lines.push(`int pageSize = ${this.pageSize};`);
        lines.push('');
        lines.push(`var baseQuery = ${ctx}.${entity}s`);
        if (tag) lines.push(`    ${tag}`);
        if (noTrack) lines.push(`    ${noTrack}`);
        lines.push(`    .Where(c => c.IsActive);`);
        lines.push('');
        lines.push(`// 1. Get Total Count`);
        lines.push(`int totalCount = await baseQuery.CountAsync(${ct});`);
        lines.push('');
        lines.push(`// 2. Fetch Paged Items`);
        lines.push(`var items = await baseQuery`);
        lines.push(`    .OrderByDescending(c => c.CreatedAtUtc)`);
        lines.push(`    .Skip((page - 1) * pageSize)`);
        lines.push(`    .Take(pageSize)`);
        lines.push(`    .Select(c => new ${entity}ResponseDto(`);
        lines.push(`        c.Id,`);
        lines.push(`        c.FirstName,`);
        lines.push(`        c.Email,`);
        lines.push(`        c.Orders.Count`);
        lines.push(`    ))`);
        lines.push(`    .ToListAsync(${ct});`);
        lines.push('');
        lines.push(`var pagedResult = new PagedList<${entity}ResponseDto>(items, totalCount, page, pageSize);`);
        break;
      }

      case 'groupby': {
        lines.push('// GroupBy with multi-metric aggregation and HAVING clause equivalent:');
        lines.push(`var metrics = await ${ctx}.${entity}s`);
        if (tag) lines.push(`    ${tag}`);
        if (noTrack) lines.push(`    ${noTrack}`);
        lines.push(`    .GroupBy(c => c.Status)`);
        lines.push(`    .Where(g => g.Count() > 10) // Translates to HAVING COUNT(*) > 10`);
        lines.push(`    .Select(g => new {`);
        lines.push(`        Status = g.Key,`);
        lines.push(`        TotalCount = g.Count(),`);
        lines.push(`        AverageCreditLimit = g.Average(c => c.CreditLimit),`);
        lines.push(`        MaxCredit = g.Max(c => c.CreditLimit)`);
        lines.push(`    })`);
        lines.push(`    .ToListAsync(${ct});`);
        break;
      }

      case 'raw-sql': {
        lines.push('// FromSqlInterpolated (Safe against SQL Injection via parameters):');
        lines.push(`string searchEmail = "test@example.com";`);
        lines.push(`decimal minCredit = 5000m;`);
        lines.push('');
        lines.push(`var results = await ${ctx}.${entity}s`);
        lines.push(`    .FromSqlInterpolated($"SELECT * FROM Customers WHERE Email = {searchEmail} AND CreditLimit >= {minCredit}")`);
        if (noTrack) lines.push(`    ${noTrack}`);
        lines.push(`    .OrderBy(c => c.LastName)`);
        lines.push(`    .ToListAsync(${ct});`);
        lines.push('');
        lines.push('// Raw Non-Entity Scalar / DTO Queries (EF Core 8+):');
        lines.push(`var summary = await ${ctx}.Database`);
        lines.push(`    .SqlQuery<CustomerSummaryDto>($"SELECT Status, COUNT(*) AS Total FROM Customers GROUP BY Status")`);
        lines.push(`    .ToListAsync(${ct});`);
        break;
      }

      case 'soft-delete': {
        lines.push('// Bypass Global Query Filters for Admin / Recovery features:');
        lines.push(`var allCustomersIncludingDeleted = await ${ctx}.${entity}s`);
        lines.push(`    .IgnoreQueryFilters()`);
        if (noTrack) lines.push(`    ${noTrack}`);
        lines.push(`    .Where(c => c.IsDeleted)`);
        lines.push(`    .ToListAsync(${ct});`);
        break;
      }

      case 'explicit-loading': {
        lines.push('// Explicitly load navigation collections on an already tracked entity:');
        lines.push(`var customer = await ${ctx}.${entity}s.FindAsync(new object[] { customerId }, ${ct});`);
        lines.push('if (customer != null)');
        lines.push('{');
        lines.push(`    // Load 1:N collection with additional filter:`);
        lines.push(`    await ${ctx}.Entry(customer)`);
        lines.push(`        .Collection(c => c.Orders)`);
        lines.push(`        .Query()`);
        lines.push(`        .Where(o => o.TotalAmount > 200)`);
        lines.push(`        .LoadAsync(${ct});`);
        lines.push('');
        lines.push(`    // Load 1:1 reference:`);
        lines.push(`    await ${ctx}.Entry(customer)`);
        lines.push(`        .Reference(c => c.BillingAddress)`);
        lines.push(`        .LoadAsync(${ct});`);
        lines.push('}');
        break;
      }
    }

    if (this.wrapInHandler) {
      const code = [
        'using System;',
        'using System.Collections.Generic;',
        'using System.Linq;',
        'using System.Threading;',
        'using System.Threading.Tasks;',
        'using Microsoft.EntityFrameworkCore;',
        '',
        `public class Get${entity}QueryHandler`,
        '{',
        `    private readonly AppDbContext _context;`,
        '',
        `    public Get${entity}QueryHandler(AppDbContext context)`,
        '    {',
        '        _context = context;',
        '    }',
        '',
        `    public async Task ExecuteAsync(CancellationToken cancellationToken = default)`,
        '    {',
        '        ' + lines.join('\n        '),
        '    }',
        '}'
      ].join('\n');
      this.result.set(code);
    } else {
      this.result.set(lines.join('\n'));
    }
  }
}
