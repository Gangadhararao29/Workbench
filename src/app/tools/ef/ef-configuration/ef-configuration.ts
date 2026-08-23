import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-ef-configuration', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './ef-configuration.html', styleUrls: ['./ef-configuration.css']
})
export class EfConfiguration {
  @Input({ required: true }) instanceId!: string;
  input = signal('public class User\n{\n  public int Id { get; set; }\n  public string Name { get; set; }\n  public string? Email { get; set; }\n}');
  result = signal('');
  generate() {
    const classMatch = this.input().match(/class\s+(\w+)[^{]*\{([\s\S]*?)\}/i);
    if (!classMatch) { this.result.set('No C# entity class found.'); return; }
    const name = classMatch[1];
    const properties = [...classMatch[2].matchAll(/(\w+(?:<[^>]+>)?)(\?)?\s+(\w+)\s*\{/g)].map(match => ({ type: match[1], nullable: Boolean(match[2]), name: match[3] }));
    const key = properties.find(property => /^id$/i.test(property.name)) ?? properties[0];
    const lines = [`public sealed class ${name}Configuration : IEntityTypeConfiguration<${name}>`, '{', `    public void Configure(EntityTypeBuilder<${name}> builder)`, '    {', `        builder.ToTable("${name}s");`, `        builder.HasKey(entity => entity.${key.name});`];
    properties.filter(property => property.name !== key.name).forEach(property => {
      lines.push(`        builder.Property(entity => entity.${property.name})${property.type.toLowerCase() === 'string' ? '.HasMaxLength(200)' : ''}${property.nullable ? '' : '.IsRequired()'};`);
    });
    lines.push('    }', '}');
    this.result.set(lines.join('\n'));
  }
}
