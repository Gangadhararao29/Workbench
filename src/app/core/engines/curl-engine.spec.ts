import { describe, it, expect } from 'vitest';
import {
  parseCurlCommand,
  formatCurlCommand,
  convertCurl,
  splitArguments,
  CURL_PRESETS,
  TARGET_OPTIONS
} from './curl-engine';

describe('Curl Engine', () => {
  describe('splitArguments', () => {
    it('should split simple space-separated arguments', () => {
      const args = splitArguments('curl -X GET https://api.example.com');
      expect(args).toEqual(['curl', '-X', 'GET', 'https://api.example.com']);
    });

    it('should handle single-quoted and double-quoted strings with spaces', () => {
      const args = splitArguments(`curl "https://api.example.com" -H 'Authorization: Bearer my-token' -d "{\\"key\\": \\"val\\"}"`);
      expect(args).toContain('https://api.example.com');
      expect(args).toContain('Authorization: Bearer my-token');
      expect(args).toContain('{"key": "val"}');
    });

    it('should handle Unix backslash, Windows caret, and PowerShell backtick line continuations', () => {
      const unixCmd = `curl -X POST \\\n  https://api.example.com \\\n  -d "test"`;
      expect(splitArguments(unixCmd)).toEqual(['curl', '-X', 'POST', 'https://api.example.com', '-d', 'test']);

      const winCmd = `curl -X POST ^\r\n  https://api.example.com ^\r\n  -d "test"`;
      expect(splitArguments(winCmd)).toEqual(['curl', '-X', 'POST', 'https://api.example.com', '-d', 'test']);

      const psCmd = `curl -X POST \`\n  https://api.example.com \`\n  -d "test"`;
      expect(splitArguments(psCmd)).toEqual(['curl', '-X', 'POST', 'https://api.example.com', '-d', 'test']);
    });
  });

  describe('parseCurlCommand', () => {
    it('should parse basic GET request', () => {
      const req = parseCurlCommand('curl https://api.example.com/users');
      expect(req.method).toBe('GET');
      expect(req.url).toBe('https://api.example.com/users');
      expect(req.host).toBe('api.example.com');
      expect(req.pathname).toBe('/users');
    });

    it('should parse request headers, user-agent, referer, and cookie flags', () => {
      const cmd = `curl -X POST https://api.example.com/login \\
        -H "Accept: application/json" \\
        -A "MyApp/1.0" \\
        -e "https://google.com" \\
        -b "session_id=xyz123"`;

      const req = parseCurlCommand(cmd);
      expect(req.method).toBe('POST');
      expect(req.headers.some(h => h.name === 'Accept' && h.value === 'application/json')).toBe(true);
      expect(req.headers.some(h => h.name === 'User-Agent' && h.value === 'MyApp/1.0')).toBe(true);
      expect(req.headers.some(h => h.name === 'Referer' && h.value === 'https://google.com')).toBe(true);
      expect(req.headers.some(h => h.name === 'Cookie' && h.value === 'session_id=xyz123')).toBe(true);
    });

    it('should parse basic authentication flag -u', () => {
      const cmd = 'curl -u "admin:secretPass" https://api.example.com/admin';
      const req = parseCurlCommand(cmd);
      expect(req.basicAuth?.username).toBe('admin');
      expect(req.basicAuth?.password).toBe('secretPass');
      expect(req.headers.some(h => h.name === 'Authorization' && h.value.startsWith('Basic '))).toBe(true);
    });

    it('should concatenate multiple -d / --data arguments with &', () => {
      const cmd = 'curl -X POST https://api.example.com/search -d "query=phone" -d "limit=20" --data-urlencode "sort=desc"';
      const req = parseCurlCommand(cmd);
      expect(req.body).toBe('query=phone&limit=20&sort=desc');
      expect(req.bodyType).toBe('form-urlencoded');
    });

    it('should recognize JSON payload and format', () => {
      const cmd = `curl -X POST https://api.example.com/items -H "Content-Type: application/json" -d '{"id": 1, "name": "Item"}'`;
      const req = parseCurlCommand(cmd);
      expect(req.bodyType).toBe('json');
      expect(req.method).toBe('POST');
    });

    it('should parse multipart form data -F', () => {
      const cmd = `curl -X POST https://api.example.com/upload -F "title=Photo" -F "file=@avatar.png"`;
      const req = parseCurlCommand(cmd);
      expect(req.formData.length).toBe(2);
      expect(req.formData[0]).toEqual({ key: 'title', value: 'Photo', isFile: false });
      expect(req.formData[1]).toEqual({ key: 'file', value: '@avatar.png', isFile: true });
      expect(req.bodyType).toBe('multipart');
    });

    it('should append -d data to query parameters when -G / --get flag is present', () => {
      const cmd = 'curl -G https://api.example.com/items -d "category=books" -d "page=2"';
      const req = parseCurlCommand(cmd);
      expect(req.method).toBe('GET');
      expect(req.url).toBe('https://api.example.com/items?category=books&page=2');
      expect(req.queryParams.length).toBe(2);
      expect(req.queryParams[0]).toEqual({ key: 'category', value: 'books' });
    });

    it('should throw error when command is empty or has no URL', () => {
      expect(() => parseCurlCommand('')).toThrow();
      expect(() => parseCurlCommand('curl -X POST')).toThrow('No target URL found');
    });
  });

  describe('formatCurlCommand', () => {
    it('should format a parsed curl request into a clean multiline curl string', () => {
      const parsed = parseCurlCommand('curl https://api.example.com/users -H "Authorization: Bearer token" -d "{\\"name\\":\\"John\\"}"');
      const formatted = formatCurlCommand(parsed);
      expect(formatted).toContain('curl -X POST "https://api.example.com/users"');
      expect(formatted).toContain('-H "Authorization: Bearer token"');
      expect(formatted).toContain('-d \'');
    });
  });

  describe('convertCurl target generators', () => {
    const samplePostJson = `curl -X POST "https://api.example.com/v1/users" \\
      -H "Content-Type: application/json" \\
      -H "Authorization: Bearer token123" \\
      -d '{"name": "Alice", "role": "Dev"}'`;

    it('should generate C# HttpClient code', () => {
      const csharp = convertCurl(samplePostJson, 'csharp');
      expect(csharp).toContain('using System.Net.Http;');
      expect(csharp).toContain('new HttpRequestMessage(HttpMethod.Post, "https://api.example.com/v1/users")');
      expect(csharp).toContain('TryAddWithoutValidation("Authorization", "Bearer token123")');
      expect(csharp).toContain('StringContent');
    });

    it('should generate C# RestSharp code', () => {
      const restsharp = convertCurl(samplePostJson, 'restsharp');
      expect(restsharp).toContain('using RestSharp;');
      expect(restsharp).toContain('new RestRequest("", Method.POST)');
      expect(restsharp).toContain('AddHeader("Authorization", "Bearer token123")');
      expect(restsharp).toContain('AddStringBody');
    });

    it('should generate JavaScript Fetch code', () => {
      const fetchCode = convertCurl(samplePostJson, 'fetch');
      expect(fetchCode).toContain("fetch('https://api.example.com/v1/users'");
      expect(fetchCode).toContain("method: 'POST'");
      expect(fetchCode).toContain('Authorization');
      expect(fetchCode).toContain('body: JSON.stringify');
    });

    it('should generate Axios code', () => {
      const axiosCode = convertCurl(samplePostJson, 'axios');
      expect(axiosCode).toContain("import axios from 'axios'");
      expect(axiosCode).toContain("axios.post('https://api.example.com/v1/users'");
    });

    it('should generate Angular HttpClient code', () => {
      const angularCode = convertCurl(samplePostJson, 'angular');
      expect(angularCode).toContain('@angular/common/http');
      expect(angularCode).toContain("http.post<any>('https://api.example.com/v1/users'");
    });

    it('should generate Python Requests code', () => {
      const pyCode = convertCurl(samplePostJson, 'python-requests');
      expect(pyCode).toContain('import requests');
      expect(pyCode).toContain("response = requests.post(");
      expect(pyCode).toContain('json=payload');
    });

    it('should generate Python HTTPX code', () => {
      const httpxCode = convertCurl(samplePostJson, 'python-httpx');
      expect(httpxCode).toContain('import httpx');
      expect(httpxCode).toContain('client.post');
    });

    it('should generate Go code', () => {
      const goCode = convertCurl(samplePostJson, 'go');
      expect(goCode).toContain('package main');
      expect(goCode).toContain('http.NewRequest("POST", "https://api.example.com/v1/users"');
      expect(goCode).toContain('req.Header.Set("Authorization", "Bearer token123")');
    });

    it('should generate Rust reqwest code', () => {
      const rustCode = convertCurl(samplePostJson, 'rust');
      expect(rustCode).toContain('use reqwest::Client;');
      expect(rustCode).toContain('.post("https://api.example.com/v1/users")');
    });

    it('should generate Java code', () => {
      const javaCode = convertCurl(samplePostJson, 'java');
      expect(javaCode).toContain('import java.net.http.HttpClient;');
      expect(javaCode).toContain('HttpRequest.newBuilder()');
    });

    it('should generate PHP code', () => {
      const phpCode = convertCurl(samplePostJson, 'php');
      expect(phpCode).toContain('<?php');
      expect(phpCode).toContain('curl_init()');
      expect(phpCode).toContain('CURLOPT_POSTFIELDS');
    });

    it('should generate Dart code', () => {
      const dartCode = convertCurl(samplePostJson, 'dart');
      expect(dartCode).toContain("package:http/http.dart");
      expect(dartCode).toContain("http.post");
    });
  });

  describe('Presets and Target Options', () => {
    it('should have predefined presets that parse and convert cleanly', () => {
      expect(CURL_PRESETS.length).toBeGreaterThan(0);
      for (const preset of CURL_PRESETS) {
        const parsed = parseCurlCommand(preset.curl);
        expect(parsed.url).toBeTruthy();
        const output = convertCurl(preset.curl, 'csharp');
        expect(output).toBeTruthy();
      }
    });

    it('should have valid target options metadata', () => {
      expect(TARGET_OPTIONS.length).toBe(12);
      for (const opt of TARGET_OPTIONS) {
        expect(opt.id).toBeTruthy();
        expect(opt.editorLanguage).toBeTruthy();
      }
    });
  });
});
