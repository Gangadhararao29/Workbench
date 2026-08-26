import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'unknown';
type LevelFilter = 'all' | LogLevel;

// 'auto' tries to sniff the format from the first few lines.
// The rest let the user force a specific parser when auto-detect guesses wrong.
export type LogFormat =
  | 'auto'
  | 'json' // GCP Cloud Logging, Azure Monitor/App Insights, Serilog (compact or standard), NLog JSON
  | 'dotnet-console' // Microsoft.Extensions.Logging console formatter output
  | 'iis' // IIS / W3C extended log format (#Fields: header + space-delimited rows)
  | 'sql-server' // SQL Server ERRORLOG format
  | 'plaintext'; // anything else with a leading ISO timestamp

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  rawLine: string;
  metadata: any;
  expanded?: boolean;
}

// --- Key aliases across the JSON-based log sources we care about ---------

const TIMESTAMP_KEYS = [
  'timestamp',
  'time',
  'Timestamp',
  'Date',
  'date',
  'ts',
  '@timestamp',
  '@t', // Serilog compact / ECS
  'TimeGenerated',
  'eventTime',
  'EventTime', // Azure Monitor / GCP
  'receiveTimestamp', // GCP Cloud Logging
];

const LEVEL_KEYS = [
  'level',
  'Level',
  'severity',
  'Severity',
  '@l', // Serilog compact
  'severityText',
  'SeverityLevel',
  'logLevel',
  'LogLevel',
  'status',
  'Status',
];

const MESSAGE_KEYS = [
  'message',
  'msg',
  'Message',
  'text',
  'desc',
  'description',
  '@m',
  '@mt',
  'MessageTemplate',
  'RenderedMessage', // Serilog
  'textPayload', // GCP unstructured payload
];

const EXCEPTION_KEYS = ['exception', 'Exception', '@x', 'stackTrace', 'StackTrace', 'err', 'error'];

// Normalizes wildly different level vocabularies (GCP severities, .NET
// abbreviations, Serilog names, syslog-ish words) down to one scale.
function normalizeLevel(raw: string | undefined | null): LogLevel {
  if (!raw) return 'unknown';
  const v = String(raw).toLowerCase();

  if (
    ['emergency', 'alert', 'critical', 'crit', 'fatal', 'fail', 'failure', 'error', 'err'].some(
      (k) => v.includes(k),
    )
  )
    return 'error';
  if (['warning', 'warn', 'notice'].some((k) => v.includes(k))) return 'warn';
  if (['information', 'info', 'default', 'log'].some((k) => v === k || v.includes(k)))
    return 'info';
  if (['debug', 'dbug', 'trace', 'trce', 'verbose'].some((k) => v.includes(k))) return 'debug';

  // bare numeric HTTP-style "status" values aren't a log level at all
  if (/^\d+$/.test(v)) return 'unknown';

  return 'unknown';
}

function makeEntry(partial: Partial<LogEntry> & { rawLine: string }): LogEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: partial.timestamp ?? '',
    level: partial.level ?? 'unknown',
    message: partial.message ?? partial.rawLine,
    rawLine: partial.rawLine,
    metadata: partial.metadata ?? null,
    expanded: false,
  };
}

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
  ],
  templateUrl: './log-viewer.html',
  styleUrls: ['./log-viewer.css'],
})
export class LogViewer implements OnInit {
  @Input({ required: true }) instanceId!: string;

  rawLogs = `{"timestamp":"2026-08-23T10:14:22.123Z","level":"INFO","message":"User login successful","userId":"user_890","ip":"192.168.1.45"}
{"timestamp":"2026-08-23T10:14:25.456Z","level":"WARN","message":"Slow database query detected","durationMs":820,"sql":"SELECT * FROM users WHERE status = 'active'"}
{"timestamp":"2026-08-23T10:14:30.987Z","level":"ERROR","message":"Failed to process payment","transactionId":"tx_9921","error":"Declined by gateway","code":503}
{"@t":"2026-08-23T10:14:33.201Z","@l":"Information","@m":"Cache warmed for tenant 4471"}
{"severity":"ERROR","message":"Container OOMKilled","resource":{"type":"gce_instance"},"timestamp":"2026-08-23T10:14:34.500Z"}
{"timestamp":"2026-08-23T10:14:35.002Z","level":"DEBUG","message":"Caching user profile session key","key":"session:user_890","ttl":3600}
2026-08-23T10:15:00.111Z [ERROR] IIS Express - Connection aborted unexpectedly by remote host.
fail: MyApp.Services.PaymentService[3]
      System.Exception: Declined by gateway
         at MyApp.Services.PaymentService.Charge() in /src/PaymentService.cs:line 42`;

  parsedLogs = signal<LogEntry[]>([]);
  activeLevel = signal<LevelFilter>('all');
  searchQuery = signal('');
  selectedFormat = signal<LogFormat>('auto');
  detectedFormat = signal<LogFormat | null>(null);

  readonly formatOptions: { value: LogFormat; label: string }[] = [
    { value: 'auto', label: 'Auto-detect' },
    { value: 'json', label: 'JSON lines (GCP / Azure / Serilog / NLog)' },
    { value: 'dotnet-console', label: '.NET console logging' },
    { value: 'iis', label: 'IIS / W3C' },
    { value: 'sql-server', label: 'SQL Server ERRORLOG' },
    { value: 'plaintext', label: 'Plain text' },
  ];

  ngOnInit() {
    // TODO: replace with a real fetch keyed on instanceId, e.g.
    // this.logsService.fetchLogs(this.instanceId).subscribe(text => { this.rawLogs = text; this.parseLogs(); });
    if (this.rawLogs) this.parseLogs();
  }

  setFormat(format: LogFormat) {
    this.selectedFormat.set(format);
    this.parseLogs();
  }

  getFormatLabel(format: LogFormat): string {
    return this.formatOptions.find((o) => o.value === format)?.label ?? format;
  }

  loadRawLogs(text: string) {
    this.rawLogs = text;
    this.parseLogs();
  }

  parseLogs() {
    const lines = this.rawLogs.split('\n');
    const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
    if (nonEmpty.length === 0) {
      this.parsedLogs.set([]);
      this.detectedFormat.set(null);
      return;
    }

    const format =
      this.selectedFormat() === 'auto' ? this.detectFormat(nonEmpty) : this.selectedFormat();
    this.detectedFormat.set(format);

    let entries: LogEntry[];
    switch (format) {
      case 'iis':
        entries = this.parseIis(lines);
        break;
      case 'dotnet-console':
        entries = this.parseDotnetConsole(lines);
        break;
      case 'sql-server':
        entries = this.parseSqlServer(lines);
        break;
      case 'json':
        entries = this.parseGenericLines(lines, true);
        break;
      case 'plaintext':
      default:
        entries = this.parseGenericLines(lines, false);
        break;
    }

    this.parsedLogs.set(entries);
  }

  // Samples the first handful of non-empty lines and picks whichever
  // strategy scores best, rather than committing to the first match.
  private detectFormat(sampleLines: string[]): LogFormat {
    const sample = sampleLines.slice(0, 10);

    if (sample.some((l) => l.startsWith('#Fields:'))) return 'iis';

    const jsonHits = sample.filter((l) => {
      try {
        JSON.parse(l);
        return true;
      } catch {
        return false;
      }
    }).length;
    if (jsonHits / sample.length >= 0.5) return 'json';

    const dotnetPattern =
      /^(?:\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s+)?(trce|dbug|info|warn|fail|crit):\s/i;
    if (sample.some((l) => dotnetPattern.test(l))) return 'dotnet-console';

    const sqlServerPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{2}\s+\S+\s+/;
    if (sample.filter((l) => sqlServerPattern.test(l)).length / sample.length >= 0.4)
      return 'sql-server';

    return 'plaintext';
  }

  // Handles JSON-lines (GCP/Azure/Serilog/NLog) AND generic plaintext,
  // since both need the same "does this line start a new entry or
  // continue the previous one" logic for stack traces.
  private parseGenericLines(lines: string[], preferJson: boolean): LogEntry[] {
    const entries: LogEntry[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Continuation of a multi-line message/stack trace: no timestamp,
      // not JSON, and indented or clearly a trace frame.
      const looksLikeContinuation =
        entries.length > 0 &&
        !line.startsWith('{') &&
        !/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(line) &&
        (/^\s{2,}/.test(rawLine) ||
          /^\s*at\s/.test(line) ||
          /^(Caused by|-->|Inner exception)/i.test(line));

      if (looksLikeContinuation) {
        const prev = entries[entries.length - 1];
        prev.message += '\n' + line;
        prev.rawLine += '\n' + line;
        continue;
      }

      let entry: LogEntry;

      if (preferJson || line.startsWith('{')) {
        try {
          const parsed = JSON.parse(line);
          const tsKey = TIMESTAMP_KEYS.find((k) => parsed[k] !== undefined);
          const lvlKey = LEVEL_KEYS.find((k) => parsed[k] !== undefined);
          let msgKey = MESSAGE_KEYS.find((k) => parsed[k] !== undefined);

          // GCP structured payload nests the message one level down.
          let message: string;
          if (msgKey) {
            message = String(parsed[msgKey]);
          } else if (parsed.jsonPayload?.message) {
            message = String(parsed.jsonPayload.message);
          } else {
            message = line;
          }

          const excKey = EXCEPTION_KEYS.find((k) => parsed[k] !== undefined);
          if (excKey) message += '\n' + String(parsed[excKey]);

          entry = makeEntry({
            timestamp: tsKey ? String(parsed[tsKey]) : '',
            level: normalizeLevel(lvlKey ? String(parsed[lvlKey]) : undefined),
            message,
            metadata: parsed,
            rawLine: line,
          });
        } catch {
          entry = this.parsePlaintextLine(line);
        }
      } else {
        entry = this.parsePlaintextLine(line);
      }

      entries.push(entry);
    }

    return entries;
  }

  private parsePlaintextLine(line: string): LogEntry {
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
    let timestamp = '';
    let message = line;

    if (dateMatch) {
      timestamp = dateMatch[1];
      message = line
        .substring(timestamp.length)
        .replace(
          /^\s*\[?(ERROR|WARN(?:ING)?|INFO(?:RMATION)?|DEBUG|TRACE|CRITICAL|FATAL)\]?\s*[-:]?\s*/i,
          '',
        );
    }

    const upperLine = line.toUpperCase();
    let level: LogLevel = 'unknown';
    if (/(ERROR|EXCEPTION|FATAL|FAIL)/.test(upperLine)) level = 'error';
    else if (/(WARN)/.test(upperLine)) level = 'warn';
    else if (/(INFO)/.test(upperLine)) level = 'info';
    else if (/(DEBUG|TRACE)/.test(upperLine)) level = 'debug';

    return makeEntry({
      timestamp: timestamp || new Date().toISOString(),
      level,
      message,
      metadata: { rawText: line },
      rawLine: line,
    });
  }

  // Microsoft.Extensions.Logging default console formatter, e.g.:
  //   info: MyApp.Controllers.PaymentController[0]
  //         Processing payment for user 890
  //   fail: MyApp.Services.PaymentService[3]
  //         System.Exception: Declined by gateway
  //            at MyApp.Services.PaymentService.Charge() in /src/PaymentService.cs:line 42
  private parseDotnetConsole(lines: string[]): LogEntry[] {
    const entries: LogEntry[] = [];
    const headerPattern =
      /^(?:(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+)?(trce|dbug|info|warn|fail|crit):\s+(.+)$/i;

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;
      const match = rawLine.match(headerPattern);

      if (match) {
        const [, ts, lvl, rest] = match;
        entries.push(
          makeEntry({
            timestamp: ts ?? '',
            level: normalizeLevel(lvl),
            message: rest.trim(),
            metadata: { category: rest.split('[')[0]?.trim() },
            rawLine,
          }),
        );
      } else if (entries.length > 0) {
        const prev = entries[entries.length - 1];
        prev.message += '\n' + rawLine.trim();
        prev.rawLine += '\n' + rawLine;
      }
    }

    return entries;
  }

  // SQL Server ERRORLOG format, e.g.:
  //   2026-08-23 10:14:22.12 spid51      Error: 823, Severity: 24, State: 2.
  //   2026-08-23 10:14:22.12 spid51      The OS returned error 21 to SQL Server...
  private parseSqlServer(lines: string[]): LogEntry[] {
    const entries: LogEntry[] = [];
    const pattern = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{2})\s+(\S+)\s+(.+)$/;

    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;
      const match = rawLine.match(pattern);

      if (match) {
        const [, ts, spid, message] = match;
        let level: LogLevel = 'info';
        if (/error:/i.test(message)) level = 'error';
        else if (/warning:/i.test(message)) level = 'warn';

        entries.push(
          makeEntry({
            timestamp: ts,
            level,
            message,
            metadata: { spid },
            rawLine,
          }),
        );
      } else if (entries.length > 0) {
        const prev = entries[entries.length - 1];
        prev.message += '\n' + rawLine.trim();
        prev.rawLine += '\n' + rawLine;
      }
    }

    return entries;
  }

  // IIS / W3C extended log format: a "#Fields:" header names the columns,
  // then each row is space-delimited in that order.
  private parseIis(lines: string[]): LogEntry[] {
    const entries: LogEntry[] = [];
    let fields: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('#Fields:')) {
        fields = line.replace('#Fields:', '').trim().split(/\s+/);
        continue;
      }
      if (line.startsWith('#')) continue; // other directives: #Software, #Version, #Date...

      const values = line.split(/\s+/);
      const row: Record<string, string> = {};
      fields.forEach((f, i) => {
        if (values[i] !== undefined) row[f] = values[i];
      });

      const dateVal = row['date'];
      const timeVal = row['time'];
      const timestamp = dateVal && timeVal ? `${dateVal}T${timeVal}Z` : '';

      const status = parseInt(row['sc-status'] ?? '', 10);
      let level: LogLevel = 'unknown';
      if (!isNaN(status)) {
        if (status >= 500) level = 'error';
        else if (status >= 400) level = 'warn';
        else level = 'info';
      }

      const message = row['cs-uri-stem']
        ? `${row['cs-method'] ?? ''} ${row['cs-uri-stem']} → ${row['sc-status'] ?? '?'}`.trim()
        : line;

      entries.push(
        makeEntry({
          timestamp,
          level,
          message,
          metadata: row,
          rawLine: line,
        }),
      );
    }

    return entries;
  }

  filteredLogs = computed(() => {
    const list = this.parsedLogs();
    const activeLvl = this.activeLevel();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter((entry) => {
      if (activeLvl !== 'all' && entry.level !== activeLvl) return false;

      if (query) {
        return (
          entry.message.toLowerCase().includes(query) || entry.rawLine.toLowerCase().includes(query)
        );
      }

      return true;
    });
  });

  setLevelFilter(level: LevelFilter) {
    this.activeLevel.set(level);
  }

  toggleExpand(entry: LogEntry) {
    this.parsedLogs.update((list) =>
      list.map((e) => (e.id === entry.id ? { ...e, expanded: !e.expanded } : e)),
    );
  }

  clearLogs() {
    this.rawLogs = '';
    this.parsedLogs.set([]);
    this.searchQuery.set('');
    this.activeLevel.set('all');
    this.detectedFormat.set(null);
  }

  formatMetadata(metadata: any): string {
    return JSON.stringify(metadata, null, 2);
  }
}
