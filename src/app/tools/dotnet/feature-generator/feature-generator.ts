import { Component, Input, OnInit, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { pascalCase } from '../../../core/engines/code-naming';
import { InstanceService } from '../../../core/instance-service';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-feature-generator',
  standalone: true,
  imports: [FormsModule, CodeEditor],
  templateUrl: './feature-generator.html',
  styleUrls: ['./feature-generator.css']
})
export class FeatureGenerator implements OnInit {
  @Input({ required: true }) instanceId!: string;
  feature = 'Product';
  namespace = 'MyApp';
  result = signal('');

  constructor(private instanceService: InstanceService) {
    effect(() => {
      // Re-run whenever config changes in the options panel
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

  private pluralize(name: string): string {
    if (name.endsWith('y') && !/[aeiou]y$/i.test(name)) {
      return `${name.slice(0, -1)}ies`;
    }
    if (/(s|x|z|ch|sh)$/i.test(name)) {
      return `${name}es`;
    }
    return `${name}s`;
  }

  generate() {
    const rawNamespace = this.namespace.trim() || 'MyApp';
    const ns = rawNamespace.replace(/[^a-zA-Z0-9_.]+/g, '') || 'MyApp';
    const name = pascalCase(this.feature, 'Feature');
    const plural = this.pluralize(name);
    const files: Array<[string, string]> = [];
    const conf = this.config();

    const includeEntity = conf['includeEntity'] ?? true;
    const includeDto = conf['includeDto'] ?? true;
    const includeRepository = conf['includeRepository'] ?? true;
    const includeService = conf['includeService'] ?? true;
    const includeController = conf['includeController'] ?? true;
    const includeConfiguration = conf['includeConfiguration'] ?? true;
    const includeFrontend = conf['includeFrontend'] ?? true;
    const includeAngularService = includeFrontend && (conf['includeAngularService'] ?? true);

    if (includeEntity) {
      files.push([
        `${name}.cs`,
        `namespace ${ns}.Domain;\n\npublic sealed class ${name}\n{\n    public int Id { get; set; }\n    public string Name { get; set; } = string.Empty;\n}`
      ]);
    }

    if (includeDto) {
      files.push([
        `${name}Dto.cs`,
        `namespace ${ns}.Application;\n\npublic sealed record ${name}Dto(int Id, string Name);\npublic sealed record Create${name}Dto(string Name);\npublic sealed record Update${name}Dto(string Name);`
      ]);
    }

    if (includeRepository) {
      files.push([
        `I${name}Repository.cs`,
        `using ${ns}.Domain;\n\nnamespace ${ns}.Domain;\n\npublic interface I${name}Repository\n{\n    Task<IReadOnlyList<${name}>> GetAllAsync(CancellationToken cancellationToken = default);\n    Task<${name}?> GetByIdAsync(int id, CancellationToken cancellationToken = default);\n    Task<${name}> AddAsync(${name} entity, CancellationToken cancellationToken = default);\n    Task UpdateAsync(${name} entity, CancellationToken cancellationToken = default);\n    Task DeleteAsync(int id, CancellationToken cancellationToken = default);\n}`
      ]);

      files.push([
        `${name}Repository.cs`,
        `using Microsoft.EntityFrameworkCore;\nusing ${ns}.Domain;\n\nnamespace ${ns}.Infrastructure;\n\npublic sealed class ${name}Repository(${ns}DbContext dbContext) : I${name}Repository\n{\n    public async Task<IReadOnlyList<${name}>> GetAllAsync(CancellationToken cancellationToken = default) =>\n        await dbContext.Set<${name}>().AsNoTracking().ToListAsync(cancellationToken);\n\n    public async Task<${name}?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>\n        await dbContext.Set<${name}>().AsNoTracking().FirstOrDefaultAsync(entity => entity.Id == id, cancellationToken);\n\n    public async Task<${name}> AddAsync(${name} entity, CancellationToken cancellationToken = default)\n    {\n        await dbContext.Set<${name}>().AddAsync(entity, cancellationToken);\n        await dbContext.SaveChangesAsync(cancellationToken);\n        return entity;\n    }\n\n    public async Task UpdateAsync(${name} entity, CancellationToken cancellationToken = default)\n    {\n        dbContext.Set<${name}>().Update(entity);\n        await dbContext.SaveChangesAsync(cancellationToken);\n    }\n\n    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)\n    {\n        var entity = await GetByIdAsync(id, cancellationToken);\n        if (entity is not null)\n        {\n            dbContext.Set<${name}>().Remove(entity);\n            await dbContext.SaveChangesAsync(cancellationToken);\n        }\n    }\n}`
      ]);
    }

    if (includeService) {
      files.push([
        `${name}Service.cs`,
        `using ${ns}.Domain;\n\nnamespace ${ns}.Application;\n\npublic sealed class ${name}Service(I${name}Repository repository)\n{\n    public async Task<IReadOnlyList<${name}Dto>> GetAllAsync(CancellationToken cancellationToken = default)\n    {\n        var entities = await repository.GetAllAsync(cancellationToken);\n        return entities.Select(entity => new ${name}Dto(entity.Id, entity.Name)).ToList();\n    }\n\n    public async Task<${name}Dto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)\n    {\n        var entity = await repository.GetByIdAsync(id, cancellationToken);\n        return entity is null ? null : new ${name}Dto(entity.Id, entity.Name);\n    }\n\n    public async Task<${name}Dto> CreateAsync(Create${name}Dto dto, CancellationToken cancellationToken = default)\n    {\n        var entity = new ${name} { Name = dto.Name };\n        var created = await repository.AddAsync(entity, cancellationToken);\n        return new ${name}Dto(created.Id, created.Name);\n    }\n\n    public async Task<${name}Dto?> UpdateAsync(int id, Update${name}Dto dto, CancellationToken cancellationToken = default)\n    {\n        var entity = await repository.GetByIdAsync(id, cancellationToken);\n        if (entity is null) return null;\n\n        entity.Name = dto.Name;\n        await repository.UpdateAsync(entity, cancellationToken);\n        return new ${name}Dto(entity.Id, entity.Name);\n    }\n\n    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)\n    {\n        var entity = await repository.GetByIdAsync(id, cancellationToken);\n        if (entity is null) return false;\n\n        await repository.DeleteAsync(id, cancellationToken);\n        return true;\n    }\n}`
      ]);
    }

    if (includeController) {
      files.push([
        `${name}Controller.cs`,
        `using Microsoft.AspNetCore.Mvc;\nusing ${ns}.Application;\n\nnamespace ${ns}.Api;\n\n[ApiController]\n[Route("api/${plural.toLowerCase()}")]\npublic sealed class ${name}Controller(${name}Service service) : ControllerBase\n{\n    [HttpGet]\n    public Task<IReadOnlyList<${name}Dto>> GetAll(CancellationToken cancellationToken) =>\n        service.GetAllAsync(cancellationToken);\n\n    [HttpGet("{id:int}")]\n    public async Task<ActionResult<${name}Dto>> GetById(int id, CancellationToken cancellationToken)\n    {\n        var result = await service.GetByIdAsync(id, cancellationToken);\n        return result is null ? NotFound() : Ok(result);\n    }\n\n    [HttpPost]\n    public async Task<ActionResult<${name}Dto>> Create([FromBody] Create${name}Dto dto, CancellationToken cancellationToken)\n    {\n        var result = await service.CreateAsync(dto, cancellationToken);\n        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);\n    }\n\n    [HttpPut("{id:int}")]\n    public async Task<ActionResult<${name}Dto>> Update(int id, [FromBody] Update${name}Dto dto, CancellationToken cancellationToken)\n    {\n        var result = await service.UpdateAsync(id, dto, cancellationToken);\n        return result is null ? NotFound() : Ok(result);\n    }\n\n    [HttpDelete("{id:int}")]\n    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)\n    {\n        var deleted = await service.DeleteAsync(id, cancellationToken);\n        return deleted ? NoContent() : NotFound();\n    }\n}`
      ]);
    }

    if (includeConfiguration) {
      files.push([
        `${name}Configuration.cs`,
        `using Microsoft.EntityFrameworkCore;\nusing Microsoft.EntityFrameworkCore.Metadata.Builders;\nusing ${ns}.Domain;\n\nnamespace ${ns}.Infrastructure;\n\npublic sealed class ${name}Configuration : IEntityTypeConfiguration<${name}>\n{\n    public void Configure(EntityTypeBuilder<${name}> builder)\n    {\n        builder.HasKey(entity => entity.Id);\n        builder.Property(entity => entity.Name).HasMaxLength(200).IsRequired();\n        builder.ToTable("${plural}");\n    }\n}`
      ]);
    }

    if (includeFrontend) {
      files.push([
        `${name.toLowerCase()}.model.ts`,
        `export interface ${name} {\n  id: number;\n  name: string;\n}\n\nexport type Create${name}Dto = Omit<${name}, 'id'>;\nexport type Update${name}Dto = Partial<Create${name}Dto>;`
      ]);
    }

    if (includeAngularService) {
      files.push([
        `${name.toLowerCase()}.service.ts`,
        `import { Injectable, inject } from '@angular/core';\nimport { HttpClient } from '@angular/common/http';\nimport { Observable } from 'rxjs';\nimport { ${name}, Create${name}Dto, Update${name}Dto } from './${name.toLowerCase()}.model';\n\n@Injectable({ providedIn: 'root' })\nexport class ${name}Service {\n  private readonly http = inject(HttpClient);\n  private readonly url = '/api/${plural.toLowerCase()}';\n\n  getAll(): Observable<${name}[]> {\n    return this.http.get<${name}[]>(this.url);\n  }\n\n  getById(id: number): Observable<${name}> {\n    return this.http.get<${name}>(\`\${this.url}/\${id}\`);\n  }\n\n  create(dto: Create${name}Dto): Observable<${name}> {\n    return this.http.post<${name}>(this.url, dto);\n  }\n\n  update(id: number, dto: Update${name}Dto): Observable<${name}> {\n    return this.http.put<${name}>(\`\${this.url}/\${id}\`, dto);\n  }\n\n  delete(id: number): Observable<void> {\n    return this.http.delete<void>(\`\${this.url}/\${id}\`);\n  }\n}`
      ]);
    }

    this.result.set(
      files.length
        ? files.map(([file, content]) => `// ==========================================\n// ${file}\n// ==========================================\n${content}`).join('\n\n')
        : 'Select at least one output option from the right-hand options panel.'
    );
  }
}
