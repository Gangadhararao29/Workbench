import { Component, Input } from '@angular/core';

interface DocLink { name: string; description: string; url: string; }
interface DocGroup { name: string; links: DocLink[]; }
@Component({
  selector: 'app-documentation-hub', standalone: true, imports: [],
  templateUrl: './documentation-hub.html', styleUrls: ['./documentation-hub.css']
})
export class DocumentationHub {
  @Input({ required: true }) instanceId!: string;
  groups: DocGroup[] = [
    { name: '.NET', links: [
      { name: 'ASP.NET Core', description: 'Build web apps and APIs with .NET.', url: 'https://learn.microsoft.com/aspnet/core/' },
      { name: 'C# guide', description: 'Language reference and programming guide.', url: 'https://learn.microsoft.com/dotnet/csharp/' },
      { name: 'EF Core', description: 'Object-relational mapping for .NET.', url: 'https://learn.microsoft.com/ef/core/' }
    ] },
    { name: 'Frontend', links: [
      { name: 'Angular', description: 'Official Angular framework documentation.', url: 'https://angular.dev/overview' },
      { name: 'TypeScript', description: 'Typed JavaScript documentation.', url: 'https://www.typescriptlang.org/docs/' },
      { name: 'React', description: 'Official React documentation.', url: 'https://react.dev/' },
      { name: 'Vue', description: 'Official Vue documentation.', url: 'https://vuejs.org/guide/introduction.html' }
    ] },
    { name: 'API and Data', links: [
      { name: 'OpenAPI', description: 'Specification and API design resources.', url: 'https://www.openapis.org/' },
      { name: 'JWT', description: 'JSON Web Token introduction and standards.', url: 'https://jwt.io/introduction' },
      { name: 'SQL Server', description: 'Microsoft SQL Server documentation.', url: 'https://learn.microsoft.com/sql/sql-server/' }
    ] }
  ];
}
