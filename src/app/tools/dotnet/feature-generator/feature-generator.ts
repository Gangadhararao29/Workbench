import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { pascalCase } from '../../../core/engines/code-naming';

@Component({
  selector: 'app-feature-generator', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './feature-generator.html', styleUrls: ['./feature-generator.css']
})
export class FeatureGenerator {
  @Input({ required: true }) instanceId!: string;
  feature = 'Product';
  namespace = 'MyApp';
  includeFrontend = true;
  result = signal('');
  generate() {
    const name = pascalCase(this.feature, 'Feature');
    const plural = `${name}s`;
    const files = [
      [`${name}.cs`, `namespace ${this.namespace}.Domain;\n\npublic class ${name}\n{\n    public int Id { get; set; }\n}`],
      [`${name}Dto.cs`, `namespace ${this.namespace}.Application;\n\npublic record ${name}Dto(int Id);`],
      [`${name}Service.cs`, `namespace ${this.namespace}.Application;\n\npublic sealed class ${name}Service\n{\n    public Task<IReadOnlyList<${name}Dto>> GetAllAsync() => Task.FromResult<IReadOnlyList<${name}Dto>>(Array.Empty<${name}Dto>());\n}`],
      [`${name}Controller.cs`, `using Microsoft.AspNetCore.Mvc;\n\nnamespace ${this.namespace}.Api;\n\n[ApiController]\n[Route("api/${plural.toLowerCase()}")]\npublic sealed class ${name}Controller : ControllerBase\n{\n    [HttpGet]\n    public ActionResult Get() => Ok();\n}`],
      [`${name}Configuration.cs`, `using Microsoft.EntityFrameworkCore;\nusing Microsoft.EntityFrameworkCore.Metadata.Builders;\n\nnamespace ${this.namespace}.Infrastructure;\n\npublic sealed class ${name}Configuration : IEntityTypeConfiguration<${name}>\n{\n    public void Configure(EntityTypeBuilder<${name}> builder)\n    {\n        builder.HasKey(entity => entity.Id);\n        builder.ToTable("${plural}");\n    }\n}`]
    ];
    if (this.includeFrontend) files.push([`${name.toLowerCase()}.model.ts`, `export interface ${name} {\n  id: number;\n}`]);
    this.result.set(files.map(([file, content]) => `// ${file}\n${content}`).join('\n\n'));
  }
}
