import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Pattern { title: string; description: string; database: string; tags: string; sql: string; }
const PATTERNS: Pattern[] = [
  { title: 'Find duplicate rows', description: 'Find values that occur more than once.', database: 'SQL Server / PostgreSQL / MySQL', tags: 'duplicates group by', sql: 'SELECT email, COUNT(*) AS total\nFROM Users\nGROUP BY email\nHAVING COUNT(*) > 1;' },
  { title: 'Latest record per group', description: 'Return the newest row for each customer.', database: 'SQL Server / PostgreSQL', tags: 'latest window row_number', sql: 'WITH ranked AS (\n  SELECT *, ROW_NUMBER() OVER (PARTITION BY CustomerId ORDER BY CreatedAt DESC) AS rank\n  FROM Orders\n)\nSELECT * FROM ranked WHERE rank = 1;' },
  { title: 'Pagination', description: 'Page through ordered results.', database: 'SQL Server', tags: 'pagination offset fetch', sql: 'SELECT * FROM Users\nORDER BY Id\nOFFSET @Skip ROWS FETCH NEXT @PageSize ROWS ONLY;' },
  { title: 'Find missing records', description: 'Find parent rows without children.', database: 'SQL Server / PostgreSQL / MySQL', tags: 'left join missing', sql: 'SELECT c.*\nFROM Customers c\nLEFT JOIN Orders o ON o.CustomerId = c.Id\nWHERE o.Id IS NULL;' }
];

@Component({
  selector: 'app-sql-search', standalone: true, imports: [FormsModule],
  templateUrl: './sql-search.html', styleUrls: ['./sql-search.css']
})
export class SqlSearch {
  @Input({ required: true }) instanceId!: string;
  query = '';
  results = signal(PATTERNS);
  search() { const terms = this.query.toLowerCase().split(/\s+/).filter(Boolean); this.results.set(PATTERNS.filter(pattern => terms.every(term => `${pattern.title} ${pattern.description} ${pattern.tags} ${pattern.sql}`.toLowerCase().includes(term)))); }
}
