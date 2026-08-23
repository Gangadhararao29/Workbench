import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { pascalCase } from '../../../core/engines/code-naming';
import { CodeEditor } from '../../../shared/code-editor/code-editor';

@Component({
  selector: 'app-feature-generator', standalone: true, imports: [FormsModule, MatButtonModule, CodeEditor],
  templateUrl: './feature-generator.html', styleUrls: ['./feature-generator.css']
})
export class FeatureGenerator {
  @Input({ required: true }) instanceId!: string;
  feature = 'Product';
  namespace = 'MyApp';
  includeEntity = true;
  includeDto = true;
  includeRepository = true;
  includeService = true;
  includeController = true;
  includeConfiguration = true;
  includeFrontend = true;
  includeAngularService = true;
  result = signal('');

  generate() {
    const name = pascalCase(this.feature, 'Feature');
    const plural = name.endsWith('s') ? name : `${name}s`;
    const files: Array<[string, string]> = [];

    if (this.includeEntity) files.push([`${name}.cs`, `namespace ${this.namespace}.Domain;\n\npublic sealed class ${name}\n{\n    public int Id { get; set; }\n}`]);
    if (this.includeDto) files.push([`${name}Dto.cs`, `namespace ${this.namespace}.Application;\n\npublic sealed record ${name}Dto(int Id);`]);
    if (this.includeRepository) files.push([`${name}Repository.cs`, `using Microsoft.EntityFrameworkCore;\nusing ${this.namespace}.Domain;\n\nnamespace ${this.namespace}.Infrastructure;\n\npublic interface I${name}Repository\n{\n    Task<IReadOnlyList<${name}>> GetAllAsync(CancellationToken cancellationToken = default);\n    Task<${name}?> GetByIdAsync(int id, CancellationToken cancellationToken = default);\n}\n\npublic sealed class ${name}Repository(${this.namespace}DbContext dbContext) : I${name}Repository\n{\n    public Task<IReadOnlyList<${name}>> GetAllAsync(CancellationToken cancellationToken = default) =>\n        dbContext.Set<${name}>().AsNoTracking().ToListAsync(cancellationToken);\n\n    public Task<${name}?> GetByIdAsync(int id, CancellationToken cancellationToken = default) =>\n        dbContext.Set<${name}>().AsNoTracking().FirstOrDefaultAsync(entity => entity.Id == id, cancellationToken);\n}`]);
    if (this.includeService) files.push([`${name}Service.cs`, `using ${this.namespace}.Domain;\n\nnamespace ${this.namespace}.Application;\n\npublic sealed class ${name}Service(I${name}Repository repository)\n{\n    public async Task<IReadOnlyList<${name}Dto>> GetAllAsync(CancellationToken cancellationToken = default)\n    {\n        var entities = await repository.GetAllAsync(cancellationToken);\n        return entities.Select(entity => new ${name}Dto(entity.Id)).ToList();\n    }\n\n    public async Task<${name}Dto?> GetByIdAsync(int id, CancellationToken cancellationToken = default)\n    {\n        var entity = await repository.GetByIdAsync(id, cancellationToken);\n        return entity is null ? null : new ${name}Dto(entity.Id);\n    }\n}`]);
    if (this.includeController) files.push([`${name}Controller.cs`, `using Microsoft.AspNetCore.Mvc;\nusing ${this.namespace}.Application;\n\nnamespace ${this.namespace}.Api;\n\n[ApiController]\n[Route("api/${plural.toLowerCase()}")]\npublic sealed class ${name}Controller(${name}Service service) : ControllerBase\n{\n    [HttpGet]\n    public Task<IReadOnlyList<${name}Dto>> GetAll(CancellationToken cancellationToken) =>\n        service.GetAllAsync(cancellationToken);\n\n    [HttpGet("{id:int}")]\n    public async Task<ActionResult<${name}Dto>> GetById(int id, CancellationToken cancellationToken)\n    {\n        var result = await service.GetByIdAsync(id, cancellationToken);\n        return result is null ? NotFound() : Ok(result);\n    }\n}`]);
    if (this.includeConfiguration) files.push([`${name}Configuration.cs`, `using Microsoft.EntityFrameworkCore;\nusing Microsoft.EntityFrameworkCore.Metadata.Builders;\nusing ${this.namespace}.Domain;\n\nnamespace ${this.namespace}.Infrastructure;\n\npublic sealed class ${name}Configuration : IEntityTypeConfiguration<${name}>\n{\n    public void Configure(EntityTypeBuilder<${name}> builder)\n    {\n        builder.HasKey(entity => entity.Id);\n        builder.ToTable("${plural}");\n    }\n}`]);
    if (this.includeFrontend) files.push([`${name.toLowerCase()}.model.ts`, `export interface ${name} {\n  id: number;\n}`]);
    if (this.includeFrontend && this.includeAngularService) files.push([`${name.toLowerCase()}.service.ts`, `import { Injectable, inject } from '@angular/core';\nimport { HttpClient } from '@angular/common/http';\nimport { Observable } from 'rxjs';\nimport { ${name} } from './${name.toLowerCase()}.model';\n\n@Injectable({ providedIn: 'root' })\nexport class ${name}Service {\n  private readonly http = inject(HttpClient);\n  private readonly url = '/api/${plural.toLowerCase()}';\n\n  getAll(): Observable<${name}[]> {\n    return this.http.get<${name}[]>(this.url);\n  }\n\n  getById(id: number): Observable<${name}> {\n    return this.http.get<${name}>(this.url + '/' + id);\n  }\n}`]);

    this.result.set(files.length ? files.map(([file, content]) => `// ${file}\n${content}`).join('\n\n') : 'Select at least one output.');
  }
}
