Great. Let's lock down the **requirements before architecture**.

I suggest we treat this as **Product Requirements v0.1**, and make decisions in layers so we don't accidentally over-engineer the first version.

# 1. Product definition

### Working name

We can use a temporary name such as **DotNet Workbench** until you choose the actual name.

### Core purpose

A developer workbench focused on **.NET full-stack development**, providing:

* code/data conversion
* code generation
* SQL utilities
* API utilities
* frontend utilities
* reusable scripts
* documentation/reference
* project/feature boilerplate generation

### Primary target

Developers who work with some combination of:

* ASP.NET Core / MVC
* Web API
* EF Core
* SQL Server
* Angular
* React
* Vue
* TypeScript
* REST APIs

---

# 2. Product principles

I think we should establish these now.

### P1 — Fast

Most tools should work immediately without a server round trip.

### P2 — Copy/paste friendly

Developer should be able to:

> paste → transform → copy

in seconds.

### P3 — Configurable

Don't force one coding style.

For example:

```text
C# → TypeScript

Naming:
  ○ PascalCase
  ● camelCase

Output:
  ○ interface
  ● type

Nullable:
  ● preserve
  ○ remove
```

### P4 — Composable

Tools should eventually be able to feed one another.

Example:

```text
SQL
 ↓
C# Entity
 ↓
DTO
 ↓
TypeScript
```

### P5 — Extensible

Especially for the Script Runner and generators.

### P6 — Local-first where practical

Sensitive code, JWTs, SQL, connection strings, etc. shouldn't need to leave the user's machine unnecessarily.

This is particularly important for a developer tool.

---

# 3. Tool classification

Every tool should belong to one of three types.

| Type        | Description                                  | Example         |
| ----------- | -------------------------------------------- | --------------- |
| Transformer | Input → output                               | C# → TypeScript |
| Generator   | Input + options → files/code                 | Entity → CRUD   |
| Script      | User-defined inputs → custom logic → outputs | Script Runner   |

This distinction should become part of our requirements.

---

# 4. MVP tool catalog

I'd propose the following initial MVP.

## C# / .NET

### C01 — C# → TypeScript

**Priority: P0**

Input:

* C# class
* record
* enum
* multiple classes

Output:

* interface
* type
* enum

Options:

* camelCase / PascalCase
* nullable handling
* collections
* nullable reference types
* `DateTime` mapping
* `Guid` mapping
* `decimal` mapping
* JSON attributes
* comments/XML documentation

---

### C02 — C# Formatter

**Priority: P1**

Input:

```text
C# source
```

Output:

```text
Formatted C#
```

Options:

* indentation
* braces
* newline style
* formatting preferences

Potentially defer detailed formatting configuration until later.

---

### C03 — C# → JSON Example

**Priority: P1**

Input:

```csharp
public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

Output:

```json
{
  "id": 1,
  "name": "string"
}
```

Options:

* realistic example values
* null values
* camelCase
* PascalCase

---

# 5. SQL requirements

SQL is **P0/P1 territory**.

## S01 — SQL Formatter

**Priority: P0**

Support initially:

* SQL Server

Later:

* PostgreSQL
* MySQL
* SQLite

Requirements:

* format
* minify
* keyword casing
* indentation
* comma style
* line breaks
* nested queries
* CTEs
* joins
* subqueries

---

## S02 — SQL → C#

**Priority: P0**

Input could be:

### Table

```sql
CREATE TABLE Users (...)
```

or:

### SELECT result

```sql
SELECT
    Id,
    Name,
    CreatedAt
FROM Users
```

Output:

* POCO
* record
* EF Core entity
* DTO

Options:

```text
Output:
 ○ Class
 ○ Record
 ○ EF Entity
 ○ DTO

Naming:
 ○ Preserve
 ● PascalCase

Namespace:
 [MyApp.Domain]
```

---

## S03 — SQL Generator

**Priority: P0**

Generate:

* SELECT
* INSERT
* UPDATE
* DELETE
* CRUD
* JOIN
* pagination
* WHERE clauses

Potentially input:

```text
Table:
Users

Columns:
Id
Name
Email
CreatedAt
```

Then generate CRUD.

---

## S04 — SQL Search

**Priority: P1**

This deserves more thought.

Search should support natural-ish queries:

```text
duplicate rows
latest record per customer
pagination
recursive hierarchy
date range
find missing records
upsert
```

Search result:

```text
Title
Description
Database
SQL
Tags
```

Initially this can be a **curated local SQL knowledge base** rather than AI.

Later:

```text
Search → semantic/fuzzy search → relevant SQL patterns
```

---

# 6. JWT requirements

## A01 — JWT Inspector

**Priority: P0**

Input:

```text
JWT
```

Output:

### Header

```text
alg
typ
kid
```

### Payload

Display claims in a table.

### Metadata

Automatically detect:

* `exp`
* `iat`
* `nbf`
* `iss`
* `aud`
* `sub`

Show:

```text
Expired
Expires in 23 minutes
```

### Important requirement

Clearly distinguish:

> **Decoded**

from:

> **Signature verified**

The MVP should be a decoder/inspector, not a token validator.

---

# 7. JSON requirements

## J01 — JSON Formatter

**Priority: P0**

Features:

* format
* minify
* validate
* error location

---

## J02 — JSON → C#

**Priority: P0**

Generate:

* class
* record
* DTO

Options:

* nullable
* naming
* root class name
* nested class strategy

---

## J03 — JSON → TypeScript

**Priority: P0**

Generate:

* interface
* type

Handle:

* arrays
* nested objects
* nullable values
* inconsistent sample types where possible

---

## J04 — JSON Diff

**Priority: P1**

Input:

```text
JSON A
JSON B
```

Output:

```text
Added
Removed
Changed
```

Ideally with a visual tree diff.

---

# 8. API toolbox

## API01 — cURL Converter

**Priority: P1**

Input:

```bash
curl ...
```

Output:

* C# HttpClient
* JavaScript fetch
* TypeScript fetch
* Angular HttpClient
* Axios

Later:

* RestSharp

---

## API02 — HTTP Request Builder

**Priority: P1**

UI:

```text
GET  https://localhost:5001/api/users

Headers
────────────────
Authorization   Bearer ...

Query
────────────────
page            1
pageSize        20

Body
────────────────
...
```

Output:

* request result
* headers
* response
* response JSON

Potentially later:

> Generate code from request.

---

## API03 — OpenAPI

**Priority: P1 initially / P0 later**

Input:

* OpenAPI JSON
* OpenAPI YAML

Capabilities:

* inspect endpoints
* inspect schemas
* generate C#
* generate TypeScript
* generate Angular services
* generate React client
* generate Vue client

This could eventually become one of the flagship features.

---

# 9. Frontend generators

I'd keep these relatively limited in MVP.

## F01 — TypeScript Model Generator

Already covered by C# / JSON.

---

## F02 — Angular Service Generator

Input:

```text
Endpoint:
GET /api/users
```

Output:

```typescript
getUsers(): Observable<User[]>
```

---

## F03 — React API Hook Generator

Input:

```text
GET /api/users
```

Output:

```typescript
useUsers()
```

---

## F04 — Vue Composable Generator

Input:

```text
GET /api/users
```

Output:

```typescript
useUsers()
```

These become more valuable once OpenAPI support exists.

---

# 10. Developer utilities

These are small but high-value.

### U01 — GUID Generator

**P0**

Features:

* one
* multiple
* uppercase
* lowercase
* SQL format
* C# format
* JSON array
* TypeScript array

---

### U02 — Timestamp Converter

**P1**

Support:

* Unix seconds
* Unix milliseconds
* ISO 8601
* UTC
* local time
* timezone

---

### U03 — Regex Tester

**P1**

Support:

* JavaScript
* C#

Show:

* matches
* groups
* capture groups
* replacement preview

---

# 11. Script Runner

This is the one I want us to specify **much more carefully**.

## SR01 — Script Runner

**Priority: P0 as a platform feature**

The basic concept:

```text
┌──────────────────────────────┐
│ My Script                    │
│                              │
│ Input 1: [____________]      │
│ Input 2: [____________]      │
│                              │
│ [ Execute ] [ Copy ]         │
│                              │
│ Output                       │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

But scripts should be defined declaratively.

Conceptually:

```text
Script
 ├── Metadata
 ├── Inputs
 ├── Variables
 ├── Actions
 ├── Script code
 └── Outputs
```

### Input types

Potential MVP:

* text
* textarea
* number
* boolean
* select
* JSON
* code editor

Later:

* file
* date
* color
* password/secret
* multi-select

### Output types

* text
* JSON
* code
* table
* markdown
* file

### Actions

Examples:

```text
Run
Copy
Clear
Reset
Download
```

Potentially custom buttons:

```text
[Generate]
[Format]
[Convert]
[Copy SQL]
[Copy JSON]
```

### Import/export

MVP:

```text
JSON
```

Later:

* ZIP package
* script bundles
* community library

---

# 12. Boilerplate generator

I'd put this **outside the first MVP**, but design requirements now.

## G01 — Feature Generator

Input:

```text
Feature:
User
```

Options:

```text
☑ Entity
☑ DTO
☑ Repository
☑ Service
☑ Controller
☑ EF Configuration
☑ Angular Model
☑ Angular Service
```

Output:

```text
User.cs
UserDto.cs
UserRepository.cs
UserService.cs
UserController.cs
UserConfiguration.cs
user.model.ts
user.service.ts
```

Critical requirement:

### Templates must be user-configurable.

This is what eventually makes the generator useful to professional teams.

---

# 13. Documentation

## D01 — Documentation Hub

**Priority: P1**

Categories:

### Microsoft

* .NET
* ASP.NET Core
* EF Core
* C#
* MS SQL

### Frontend

* Angular
* React
* Vue
* TypeScript

### Other

* Docker
* Git
* OpenAPI
* JWT

Each entry should ideally contain:

```text
Name
Description
Official documentation
Relevant sections
Cheat sheets
```

For external documentation, I'd strongly favor **official sources** rather than trying to duplicate documentation.

---

# 14. Search

This should be a global feature.

Something like:

```text
┌───────────────────────────────────────────────┐
│ 🔎 Search tools, SQL, snippets, documentation │
└───────────────────────────────────────────────┘
```

Search:

```text
JWT
```

might return:

```text
Tools
  JWT Inspector

Documentation
  ASP.NET Core JWT Authentication

Snippets
  Read JWT claim in C#

Scripts
  Decode JWT

SQL
  ...
```

This becomes increasingly valuable as the application grows.

---

# 15. Favorites and history

I would make these requirements from day one.

### Favorites

User can ⭐ any tool/script.

### Recent

Remember recently used tools.

### History

Potentially:

```text
Tool
Timestamp
Input
Output
```

But there's a privacy question here.

I'd default to:

> **History stored locally and optionally disabled.**

No automatic cloud storage of source code.

---

# 16. Workspace

Eventually users should have:

```text
My Workspace
├── Favorites
├── Scripts
├── Templates
├── Generators
└── Settings
```

This makes the product feel like an actual developer environment rather than a webpage full of utilities.

---

# 17. Security requirements

This deserves explicit requirements.

### Local processing

Tools such as:

* JWT
* SQL
* C#
* JSON
* scripts

should preferably process locally where technically possible.

### No secret collection

Never require:

* database passwords
* JWT secrets
* API keys

for basic functionality.

### Script security

The Script Runner is potentially dangerous depending on what languages/capabilities we allow.

Therefore we need to decide later:

> **What exactly can a script access?**

For example:

```text
Can it access the filesystem?
Can it access network?
Can it execute processes?
Can it access environment variables?
Can it access browser APIs?
```

This will be one of the biggest architecture/security decisions later.

---

# 18. Tool UX standard

Every normal tool should follow roughly the same pattern:

```text
┌─────────────────────────────────────────────┐
│ Tool Name                                   │
│ Description                                 │
├─────────────────────────────────────────────┤
│                                             │
│ INPUT                    OPTIONS             │
│ ┌───────────────────┐   ┌───────────────┐   │
│ │                   │   │               │   │
│ │                   │   │               │   │
│ │                   │   │               │   │
│ └───────────────────┘   └───────────────┘   │
│                                             │
│              [ Transform ]                  │
│                                             │
│ OUTPUT                                      │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [Copy] [Download] [Clear]                   │
└─────────────────────────────────────────────┘
```

But tools can override this when necessary.

---

# 19. Keyboard-first requirements

Since this is a developer tool, I'd consider these important:

| Shortcut       | Action           |
| -------------- | ---------------- |
| `Ctrl+Enter`   | Run/Transform    |
| `Ctrl+Shift+C` | Copy output      |
| `Ctrl+K`       | Global search    |
| `Ctrl+/`       | Focus tool input |
| `Esc`          | Close modal      |
| `Ctrl+Shift+P` | Command palette  |

Eventually:

### Command Palette

```text
> SQL formatter
> JWT inspector
> C# → TypeScript
> Generate GUID
> OpenAPI generator
> My scripts
```

That could make the application extremely fast to use.

---

# 20. MVP priority

I'd now classify everything like this:

### 🔴 P0 — Build first

1. C# → TypeScript
2. SQL Formatter
3. SQL → C#
4. SQL Generator
5. JSON Formatter
6. JSON → C#
7. JSON → TypeScript
8. JWT Inspector
9. GUID Generator
10. Script Runner foundation
11. Global tool search
12. Favorites/recent

### 🟠 P1 — Next

13. C# Formatter
14. C# → JSON
15. SQL Search
16. JSON Diff
17. cURL converter
18. HTTP Request Builder
19. OpenAPI
20. Regex
21. Timestamp
22. Documentation Hub
23. Angular generator
24. React generator
25. Vue generator

### 🟡 P2 — Product expansion

26. Feature Generator
27. Custom templates
28. Docker generator
29. appsettings generator
30. test-data generator
31. NuGet helper
32. Git toolbox
33. EF Core toolbox
34. reusable community scripts
35. AI assistant

---

# 21. One thing I'd change from your original list

I'd move **SQL Search** slightly away from "search SQL syntax."

Instead, make it:

> **Search for developer solutions/patterns.**

For example:

**Search:**

> "get latest order for every customer"

Results:

```text
SQL Server
──────────────
ROW_NUMBER()
CROSS APPLY
MAX + JOIN

PostgreSQL
──────────────
DISTINCT ON
ROW_NUMBER()
```

That is much more useful than searching for literal SQL strings.

---

# 22. The product's eventual killer workflow

This is the direction I'd like us to keep in mind:

```text
                    ┌──────────────┐
                    │  OpenAPI     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
            C# DTO       TS Model      API
              │            │            │
              ↓            ↓            ↓
           EF Core      Angular       React
              │            │            │
              ↓            ↓            ↓
             SQL          Vue       HTTP Client
              │
              ↓
        SQL Generator
```

And alongside that:

```text
                Developer Workbench
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     Tools          Generators      Scripts
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                  Search / Docs
```

That gives us a coherent product.

---

## Next requirements step

Before architecture, I suggest we go **one level deeper**.

I'd start with the **P0 tools**, and for each one define:

1. Exact input formats
2. Exact output formats
3. Supported language/version
4. Options
5. Validation
6. Error handling
7. Edge cases
8. Copy/download behavior
9. Example inputs/outputs
10. What is explicitly **out of scope**

I'd start with **C# → TypeScript**, because it will force us to make several important product decisions around nullable types, generics, enums, collections, attributes, naming, nested classes, and multiple-file input. Those decisions will also influence several of the other generators.
