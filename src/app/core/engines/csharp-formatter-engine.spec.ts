import { formatCsharp } from './csharp-formatter-engine';

describe('CsharpFormatterEngine', () => {
  it('formats simple class with auto-properties in Allman style', () => {
    const input = 'public class User { public int Id { get; set; } public string Name { get; set; } }';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'public class User',
      '{',
      '    public int Id { get; set; }',
      '    public string Name { get; set; }',
      '}'
    ].join('\n'));
  });

  it('formats simple class with auto-properties in K&R style', () => {
    const input = 'public class User { public int Id { get; set; } public string Name { get; set; } }';
    const output = formatCsharp(input, { braceStyle: 'kr' });
    expect(output).toBe([
      'public class User {',
      '    public int Id { get; set; }',
      '    public string Name { get; set; }',
      '}'
    ].join('\n'));
  });

  it('handles for loops without breaking semicolons across lines', () => {
    const input = 'for (int i = 0; i < 10; i++) { Console.WriteLine(i); }';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'for (int i = 0; i < 10; i++)',
      '{',
      '    Console.WriteLine(i);',
      '}'
    ].join('\n'));
  });

  it('attaches trailing semicolon to object initializer closing brace', () => {
    const input = 'var person = new Person { Name = "Alice", Age = 30 };';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'var person = new Person',
      '{',
      '    Name = "Alice", Age = 30',
      '};'
    ].join('\n'));
  });

  it('collapses auto-properties with access modifiers and initializers', () => {
    const input = 'public class Foo { public string Name { get; private set; } = "default"; }';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'public class Foo',
      '{',
      '    public string Name { get; private set; } = "default";',
      '}'
    ].join('\n'));
  });

  it('correctly handles verbatim strings with backslashes before quotes', () => {
    const input = 'string path = @"C:\\Folder\\"; Console.WriteLine(path);';
    const output = formatCsharp(input);
    expect(output).toBe([
      'string path = @"C:\\Folder\\";',
      'Console.WriteLine(path);'
    ].join('\n'));
  });

  it('preserves blank lines between methods', () => {
    const input = [
      'public class Calc {',
      '    public int Add(int a, int b) { return a + b; }',
      '',
      '    public int Sub(int a, int b) { return a - b; }',
      '}'
    ].join('\n');

    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'public class Calc',
      '{',
      '    public int Add(int a, int b)',
      '    {',
      '        return a + b;',
      '    }',
      '',
      '    public int Sub(int a, int b)',
      '    {',
      '        return a - b;',
      '    }',
      '}'
    ].join('\n'));
  });

  it('formats attributes on separate lines', () => {
    const input = '[Serializable] public class Item { [Key] public int Id { get; set; } }';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      '[Serializable]',
      'public class Item',
      '{',
      '    [Key]',
      '    public int Id { get; set; }',
      '}'
    ].join('\n'));
  });

  it('attaches callback closing parens to closing brace', () => {
    const input = 'services.AddCors(opt => { opt.AddDefaultPolicy(p => p.AllowAnyOrigin()); });';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'services.AddCors(opt =>',
      '{',
      '    opt.AddDefaultPolicy(p => p.AllowAnyOrigin());',
      '});'
    ].join('\n'));
  });

  it('formats generic types and method signatures cleanly', () => {
    const input = 'public Dictionary<string, List<int>> GetMap(int a, string b) { return new(); }';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'public Dictionary<string, List<int>> GetMap(int a, string b)',
      '{',
      '    return new();',
      '}'
    ].join('\n'));
  });

  it('formats switch cases and default cleanly', () => {
    const input = 'switch (x) { case 1: return "one"; default: return "other"; }';
    const output = formatCsharp(input, { braceStyle: 'allman' });
    expect(output).toBe([
      'switch (x)',
      '{',
      '    case 1:',
      '    return "one";',
      '    default:',
      '    return "other";',
      '}'
    ].join('\n'));
  });

  it('handles empty input gracefully', () => {
    expect(formatCsharp('')).toBe('');
    expect(formatCsharp('   ')).toBe('');
  });
});
