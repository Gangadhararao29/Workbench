import { Component, Input } from '@angular/core';

interface DocLink {
  name: string;
  description: string;
  url: string;
}
interface DocGroup {
  name: string;
  links: DocLink[];
}
@Component({
  selector: 'app-documentation-hub',
  standalone: true,
  imports: [],
  templateUrl: './documentation-hub.html',
  styleUrls: ['./documentation-hub.css'],
})
export class DocumentationHub {
  @Input({ required: true }) instanceId!: string;
  groups: DocGroup[] = [
    {
      name: '.NET',
      links: [
        {
          name: 'ASP.NET Core',
          description: 'Build web apps and APIs with .NET.',
          url: 'https://learn.microsoft.com/aspnet/core/',
        },
        {
          name: 'C# guide',
          description: 'Language reference and programming guide.',
          url: 'https://learn.microsoft.com/dotnet/csharp/',
        },
        {
          name: 'EF Core',
          description: 'Object-relational mapping for .NET.',
          url: 'https://learn.microsoft.com/ef/core/',
        },
        {
          name: '.NET Fundamentals',
          description: 'Core .NET concepts, SDK, and runtime docs.',
          url: 'https://learn.microsoft.com/dotnet/fundamentals/',
        },
      ],
    },
    {
      name: 'Frontend',
      links: [
        {
          name: 'Angular',
          description: 'Official Angular framework documentation.',
          url: 'https://angular.dev/overview',
        },
        {
          name: 'TypeScript',
          description: 'Typed JavaScript documentation.',
          url: 'https://www.typescriptlang.org/docs/',
        },
        { name: 'React', description: 'Official React documentation.', url: 'https://react.dev/' },
        {
          name: 'Vue',
          description: 'Official Vue documentation.',
          url: 'https://vuejs.org/guide/introduction.html',
        },
        {
          name: 'MDN Web Docs',
          description: 'Reference for HTML, CSS, and JavaScript.',
          url: 'https://developer.mozilla.org/',
        },
        {
          name: 'RxJS',
          description: 'Reactive programming with observables.',
          url: 'https://rxjs.dev/guide/overview',
        },
      ],
    },
    {
      name: 'API and Data',
      links: [
        {
          name: 'OpenAPI',
          description: 'Specification and API design resources.',
          url: 'https://www.openapis.org/',
        },
        {
          name: 'JWT',
          description: 'JSON Web Token introduction and standards.',
          url: 'https://jwt.io/introduction',
        },
        {
          name: 'SQL Server',
          description: 'Microsoft SQL Server documentation.',
          url: 'https://learn.microsoft.com/sql/sql-server/',
        },
        {
          name: 'GraphQL',
          description: 'Query language for APIs.',
          url: 'https://graphql.org/learn/',
        },
        {
          name: 'PostgreSQL',
          description: 'Open-source relational database documentation.',
          url: 'https://www.postgresql.org/docs/',
        },
      ],
    },
    {
      name: 'Tools',
      links: [
        {
          name: 'Git',
          description: 'Version control reference and workflows.',
          url: 'https://git-scm.com/doc',
        },
        {
          name: 'Docker',
          description: 'Container platform documentation.',
          url: 'https://docs.docker.com/',
        },
        {
          name: 'GitHub Actions',
          description: 'CI/CD workflows for GitHub repos.',
          url: 'https://docs.github.com/actions',
        },
        {
          name: 'Postman',
          description: 'API testing and request collections.',
          url: 'https://learning.postman.com/docs/introduction/overview/',
        },
        {
          name: 'VS Code',
          description: 'Editor docs, extensions, and shortcuts.',
          url: 'https://code.visualstudio.com/docs',
        },
        {
          name: 'npm',
          description: 'Package manager docs and registry.',
          url: 'https://docs.npmjs.com/',
        },
      ],
    },
  ];
}
