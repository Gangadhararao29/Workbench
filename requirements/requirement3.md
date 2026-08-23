Perfect. Let's begin with **C# → TypeScript**, and keep this strictly at the **requirements level**—no implementation/architecture yet.

# C# → TypeScript — Requirements v0.1

## 1. Purpose

Convert C# types commonly used in .NET applications into equivalent TypeScript definitions.

Primary use case:

> Developer copies a DTO/entity/model from a .NET project → pastes it into the tool → gets frontend-ready TypeScript.

The tool should support both **single types and multiple related types**.

---

# 2. Supported C# input

### P0

Support:

* `class`
* `record`
* `record class`
* `struct`
* `enum`
* multiple types in one input
* properties
* fields
* generic types
* nullable types
* collections
* nested objects

Example:

```csharp
public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}
```

---

# 3. Basic type mappings

We need to establish an explicit mapping table.

| C#               | TypeScript |
| ---------------- | ---------- |
| `string`         | `string`   |
| `char`           | `string`   |
| `bool`           | `boolean`  |
| `byte`           | `number`   |
| `short`          | `number`   |
| `int`            | `number`   |
| `long`           | `number`   |
| `float`          | `number`   |
| `double`         | `number`   |
| `decimal`        | `number`   |
| `Guid`           | `string`   |
| `DateTime`       | `Date`     |
| `DateTimeOffset` | `Date`     |
| `TimeSpan`       | `string`   |
| `object`         | `unknown`  |
| `dynamic`        | `unknown`  |

Potentially configurable later.

---

# 4. Nullable types

This is one of the important decisions.

C#:

```csharp
public int? Age { get; set; }
public string? Name { get; set; }
```

Default output should probably be:

```typescript
interface User {
    age: number | null;
    name: string | null;
}
```

rather than:

```typescript
age?: number;
name?: string;
```

because:

**nullable ≠ optional**.

That's an important semantic distinction.

We should support a setting:

```text
Nullable handling

● null
○ optional
○ null + optional
```

Where:

### null

```typescript
name: string | null;
```

### optional

```typescript
name?: string;
```

### null + optional

```typescript
name?: string | null;
```

---

# 5. Non-nullable reference types

C#:

```csharp
public string Name { get; set; }
```

Default:

```typescript
name: string;
```

C#:

```csharp
public string? Name { get; set; }
```

Default:

```typescript
name: string | null;
```

We should **not** assume every `string` is optional just because older C# projects didn't use nullable reference types.

---

# 6. Collections

Support:

```csharp
List<User>
IList<User>
ICollection<User>
IEnumerable<User>
IReadOnlyCollection<User>
IReadOnlyList<User>
User[]
```

Default:

```typescript
User[]
```

Example:

```csharp
public List<User> Users { get; set; }
```

→

```typescript
users: User[];
```

Optionally support:

```text
Collection syntax

● T[]
○ Array<T>
```

---

# 7. Dictionaries

C#:

```csharp
Dictionary<string, string>
```

Default:

```typescript
Record<string, string>
```

Example:

```csharp
Dictionary<int, User>
```

→

```typescript
Record<number, User>
```

Potentially later support:

```typescript
Map<K, V>
```

through an option.

---

# 8. Generics

C#:

```csharp
public class ApiResponse<T>
{
    public T Data { get; set; }
}
```

Output:

```typescript
export interface ApiResponse<T> {
    data: T;
}
```

Also:

```csharp
ApiResponse<List<User>>
```

should become something like:

```typescript
ApiResponse<User[]>
```

---

# 9. Enums

C#:

```csharp
public enum UserStatus
{
    Active,
    Disabled,
    Pending
}
```

Default:

```typescript
export enum UserStatus {
    Active = "Active",
    Disabled = "Disabled",
    Pending = "Pending"
}
```

But this needs options.

### Output modes

```text
Enum output

● TypeScript enum
○ String union
○ Number union
```

String union:

```typescript
export type UserStatus =
    | "Active"
    | "Disabled"
    | "Pending";
```

---

# 10. Explicit enum values

C#:

```csharp
public enum UserStatus
{
    Active = 1,
    Disabled = 2,
    Pending = 5
}
```

TypeScript enum:

```typescript
export enum UserStatus {
    Active = 1,
    Disabled = 2,
    Pending = 5
}
```

We should preserve explicit values.

---

# 11. JSON naming attributes

This is important for real-world ASP.NET applications.

Example:

```csharp
public class User
{
    [JsonPropertyName("user_name")]
    public string Name { get; set; }
}
```

Output:

```typescript
export interface User {
    user_name: string;
}
```

Support:

```csharp
[JsonPropertyName(...)]
```

P0/P1 depending on implementation complexity.

Later we can support other serializers/attributes.

---

# 12. Naming strategy

Default should probably be:

```text
C#:
PascalCase

↓

TypeScript:
camelCase
```

Example:

```csharp
CreatedAt
UserName
IsActive
```

→

```typescript
createdAt
userName
isActive
```

Options:

```text
Property naming

● camelCase
○ PascalCase
○ Preserve
○ Custom
```

---

# 13. Class output

Default:

```typescript
export interface UserDto {
    id: number;
    name: string;
}
```

Options:

```text
Output type

● interface
○ type
○ class
```

I'd make `interface` the default because that is the most natural frontend DTO/model representation.

---

# 14. C# records

Input:

```csharp
public record UserDto(
    int Id,
    string Name,
    DateTime CreatedAt);
```

Output:

```typescript
export interface UserDto {
    id: number;
    name: string;
    createdAt: Date;
}
```

The C# distinction between class/record doesn't necessarily need to survive into TypeScript unless the user chooses class output.

---

# 15. Nested types

Input:

```csharp
public class Order
{
    public int Id { get; set; }
    public Customer Customer { get; set; }
}

public class Customer
{
    public int Id { get; set; }
    public string Name { get; set; }
}
```

Output:

```typescript
export interface Order {
    id: number;
    customer: Customer;
}

export interface Customer {
    id: number;
    name: string;
}
```

---

# 16. Nested classes

Potential input:

```csharp
public class Order
{
    public class Address
    {
        public string City { get; set; }
    }

    public Address ShippingAddress { get; set; }
}
```

For MVP I'd flatten them:

```typescript
export interface OrderAddress {
    city: string;
}

export interface Order {
    shippingAddress: OrderAddress;
}
```

But this can be marked as a later refinement.

---

# 17. XML documentation

Input:

```csharp
/// <summary>
/// Represents a customer.
/// </summary>
public class Customer
{
    /// <summary>
    /// Customer identifier.
    /// </summary>
    public int Id { get; set; }
}
```

Option:

```text
☑ Preserve XML documentation
```

Output:

```typescript
/** Represents a customer. */
export interface Customer {
    /** Customer identifier. */
    id: number;
}
```

Very useful for frontend developers.

---

# 18. Attributes

We shouldn't blindly convert every C# attribute.

Instead:

### Known attributes

Convert attributes that have an obvious TypeScript/JSON meaning.

For example:

```csharp
[JsonPropertyName("user_name")]
```

### Unknown attributes

Ignore by default.

Optionally:

```text
☑ Preserve unknown attributes as comments
```

---

# 19. Namespace handling

Input:

```csharp
namespace MyApp.Models;

public class User
{
}
```

We don't need to reproduce namespaces.

But we could optionally use namespace information for:

* output folder
* module naming
* imports

Not necessary for MVP.

---

# 20. Multiple-file / multiple-type input

The input editor should accept:

```csharp
public class User {}
public class Product {}
public class Order {}
```

and generate all types.

Output:

```typescript
export interface User {}

export interface Product {}

export interface Order {}
```

---

# 21. Imports

If mappings require imports, generate them.

For example, if we eventually support custom types such as:

```typescript
Date
```

we don't need an import.

But if a user configures:

```text
DateTime → Luxon DateTime
```

then:

```typescript
import { DateTime } from "luxon";
```

This is probably a **later customization feature**, not MVP.

---

# 22. Output formatting

Generated output should automatically be formatted.

Basic requirements:

* consistent indentation
* consistent braces
* blank line between types
* newline at end of file

---

# 23. Main UI

I'd make the tool roughly:

```text
C# → TypeScript

┌───────────────────────────┐
│ C# Input                  │
│                           │
│ public class User         │
│ {                         │
│     ...                   │
│ }                         │
│                           │
└───────────────────────────┘

Options
─────────────────────────────
Output        [Interface ▼]
Naming        [camelCase ▼]
Collections   [T[] ▼]
Enums         [Enum ▼]
Nullable      [null ▼]

☑ Export
☐ Documentation

        [ Convert ]

┌───────────────────────────┐
│ TypeScript Output         │
│                           │
│ export interface User {   │
│     ...                   │
│ }                         │
│                           │
└───────────────────────────┘

[Copy] [Download] [Clear]
```

---

# 24. Validation

Before conversion, identify obvious problems.

Examples:

### Invalid C#

```text
Unable to parse input.
Line 14, column 7.
```

### Unsupported type

```text
Unsupported C# type: MyCustomType
```

But rather than failing completely, ideally generate:

```typescript
myProperty: unknown;
```

and show a warning:

> `MyCustomType` could not be mapped automatically.

---

# 25. Warnings

Warnings should not necessarily prevent generation.

Example:

```text
⚠ 3 properties use unsupported/custom C# types.

MyCustomType → unknown
SomeType → unknown
Foo → unknown
```

This is much better than simply saying:

> Conversion failed.

---

# 26. Copy/download

Every generator should eventually have the same output actions:

* Copy
* Download
* Select all
* Clear
* Reset

For this particular tool:

**Download filename:**

```text
UserDto.ts
```

If multiple types:

```text
models.ts
```

Potentially later:

> **Download as ZIP**

with one file per type.

---

# 27. Import/export configuration

Later we should allow:

```json id="2i4kqm"
{
    "output": "interface",
    "naming": "camelCase",
    "nullable": "null",
    "enumMode": "enum"
}
```

This becomes useful for:

* sharing configurations
* teams
* scripts
* automation
* eventually CLI support

Not required for initial implementation.

---

# 28. Important edge cases

We should explicitly test:

### Nullable

```csharp
string?
int?
DateTime?
List<string>?
```

### Collections

```csharp
List<T>
IEnumerable<T>
T[]
ICollection<T>
```

### Generics

```csharp
Response<T>
Dictionary<string, T>
List<Response<User>>
```

### Enums

```csharp
Active
Active = 1
Active = 10
```

### Attributes

```csharp
[JsonPropertyName("foo")]
```

### Names

```csharp
URL
APIKey
IPAddress
CreatedAt
```

### Special types

```csharp
Guid
DateTime
DateTimeOffset
TimeSpan
decimal
byte[]
```

### Nested objects

```csharp
User.Address
```

### Inheritance

```csharp
public class Admin : User
```

This one deserves a decision.

---

# 29. Inheritance

For MVP, I'd support basic inheritance but not attempt to reproduce the entire C# type system.

Example:

```csharp
public class AdminUser : User
{
    public string Role { get; set; }
}
```

Potential output:

```typescript
export interface AdminUser extends User {
    role: string;
}
```

That's a natural mapping.

---

# 30. Interfaces

Input:

```csharp
public interface IUser
{
    int Id { get; set; }
    string Name { get; set; }
}
```

Output:

```typescript
export interface IUser {
    id: number;
    name: string;
}
```

Potential option later:

```text
☑ Remove C# "I" prefix
```

→

```typescript
export interface User
```

I'd **not** automatically remove it initially. Preserve the type name unless the user chooses a naming transformation.

---

# 31. Static/readonly/const

We need to decide whether modifiers matter.

For normal DTO generation:

```csharp
public readonly string Name;
```

TypeScript:

```typescript
readonly name: string;
```

Likewise:

```csharp
const
```

could become:

```typescript
readonly
```

But this should be a later enhancement.

For MVP, properties are the priority.

---

# 32. Access modifiers

Normally ignore:

```csharp
public
private
protected
internal
```

unless generating TypeScript classes.

For interface output:

```csharp
public string Name
```

simply becomes:

```typescript
name: string;
```

---

# 33. Proposed P0 scope

So I'd lock the first version to:

### Supported

* class
* record
* interface
* enum
* properties
* fields
* primitive types
* nullable types
* arrays
* common collections
* dictionaries
* generics
* nested object references
* inheritance
* `JsonPropertyName`
* multiple types
* camelCase
* interface/type output
* enum output
* copy/download
* validation/warnings

### Explicitly defer

* arbitrary C# expressions
* methods
* constructors
* events
* delegates
* advanced attributes
* complex generic constraints
* full C# language parsing
* source project/solution ingestion
* NuGet package inspection
* custom external type mappings
* automatic file/folder generation
* custom templates

---

# 34. One decision I recommend making now

There are **two possible philosophies** for this entire product.

### Philosophy A — Simple converters

> "Give me valid C# and I'll convert it."

This is relatively straightforward.

### Philosophy B — .NET-aware development assistant

> "Understand how .NET developers actually structure applications and generate frontend-ready artifacts."

This gives us much more powerful features later.

I strongly recommend **B**.

That means, for example, eventually understanding:

```text
[JsonPropertyName]
[Required]
[StringLength]
[Range]
[Key]
[NotMapped]
```

and knowing which ones affect the generated TypeScript and which don't.

It also means understanding:

```text
DTO
Entity
Request
Response
Enum
```

rather than treating every C# class as an arbitrary class.

---

## Requirement status

I'd mark this feature:

**C# → TypeScript — Requirements v0.1: Drafted**

Before we move to the next P0 tool, I think there are **3 product-level decisions worth settling** because they'll affect many later tools:

1. **Should the default TypeScript output be `interface` or `type`?**
   My recommendation: `interface`.

2. **Should `DateTime` become `Date` or `string`?**
   My recommendation for a frontend model generator is actually **`string` by default**, because ASP.NET JSON APIs normally transmit dates as strings. We should probably reconsider the earlier `Date` mapping.

3. **Should the tool be browser-local by default?**
   My recommendation: **yes**, wherever technically possible. SQL, JWTs, source code, JSON, etc. shouldn't be sent to a backend just to perform a conversion.

Once those are settled, I'd move to **SQL Formatter**, because it will establish another important requirement pattern: database dialects, formatting profiles, and whether tools should preserve comments.
