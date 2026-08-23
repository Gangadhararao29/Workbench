import { Component, Input, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'unknown';
  message: string;
  rawLine: string;
  metadata: any;
  expanded?: boolean;
}

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './log-viewer.html',
  styleUrls: ['./log-viewer.css']
})
export class LogViewer {
  @Input({ required: true }) instanceId!: string;

  rawLogs = '{"timestamp":"2026-08-23T10:14:22.123Z","level":"INFO","message":"User login successful","userId":"user_890","ip":"192.168.1.45"}\n{"timestamp":"2026-08-23T10:14:25.456Z","level":"WARN","message":"Slow database query detected","durationMs":820,"sql":"SELECT * FROM users WHERE status = \'active\'"}\n{"timestamp":"2026-08-23T10:14:30.987Z","level":"ERROR","message":"Failed to process payment","transactionId":"tx_9921","error":"Declined by gateway","code":503}\n{"timestamp":"2026-08-23T10:14:35.002Z","level":"DEBUG","message":"Caching user profile session key","key":"session:user_890","ttl":3600}\n2026-08-23T10:15:00.111Z [ERROR] IIS Express - Connection aborted unexpectedly by remote host.';
  
  parsedLogs = signal<LogEntry[]>([]);
  activeLevel = signal<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  searchQuery = signal('');

  // Auto parse default logs on load
  ngOnInit() {
    this.parseLogs();
  }

  parseLogs() {
    const lines = this.rawLogs.split('\n');
    const entries: LogEntry[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const id = crypto.randomUUID();
      let timestamp = '';
      let level: 'error' | 'warn' | 'info' | 'debug' | 'unknown' = 'unknown';
      let message = '';
      let metadata: any = null;

      // 1. Try to parse as JSON
      try {
        const parsed = JSON.parse(line);
        metadata = parsed;

        // Try extracting timestamp
        const tsKey = ['timestamp', 'time', '@timestamp', 'Timestamp', 'Date', 'date'].find(k => parsed[k] !== undefined);
        if (tsKey) timestamp = String(parsed[tsKey]);

        // Try extracting level
        const lvlKey = ['level', 'Level', 'severity', 'Severity', 'status', 'Status'].find(k => parsed[k] !== undefined);
        if (lvlKey) {
          const lvlStr = String(parsed[lvlKey]).toLowerCase();
          if (lvlStr.includes('err') || lvlStr.includes('fail') || lvlStr === 'fatal') level = 'error';
          else if (lvlStr.includes('warn')) level = 'warn';
          else if (lvlStr.includes('inf')) level = 'info';
          else if (lvlStr.includes('deb')) level = 'debug';
        }

        // Try extracting message
        const msgKey = ['message', 'msg', 'Message', 'text', 'desc', 'description'].find(k => parsed[k] !== undefined);
        if (msgKey) message = String(parsed[msgKey]);
        else message = line; // Fallback to raw JSON line

      } catch {
        // 2. Treat as plain text
        const upperLine = line.toUpperCase();
        
        // Detect level
        if (upperLine.includes('ERROR') || upperLine.includes('EXCEPTION') || upperLine.includes('FATAL') || upperLine.includes('FAIL')) level = 'error';
        else if (upperLine.includes('WARN') || upperLine.includes('WARNING')) level = 'warn';
        else if (upperLine.includes('INFO') || upperLine.includes('INFORMATION')) level = 'info';
        else if (upperLine.includes('DEBUG')) level = 'debug';

        // Extract timestamp using ISO date regex fallback
        const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
        if (dateMatch) {
          timestamp = dateMatch[1];
          // Message is line content after timestamp
          message = line.substring(timestamp.length).replace(/^[^a-zA-Z0-9]+/, '');
        } else {
          timestamp = new Date().toISOString();
          message = line;
        }
        metadata = { rawText: line };
      }

      entries.push({
        id,
        timestamp,
        level,
        message,
        rawLine: line,
        metadata,
        expanded: false
      });
    }

    this.parsedLogs.set(entries);
  }

  // Filter list by status level and text queries
  filteredLogs = computed(() => {
    const list = this.parsedLogs();
    const activeLvl = this.activeLevel();
    const query = this.searchQuery().toLowerCase().trim();

    return list.filter(entry => {
      // Level check
      if (activeLvl !== 'all') {
        if (entry.level !== activeLvl) return false;
      }
      
      // Keyword search check
      if (query) {
        const matchesMsg = entry.message.toLowerCase().includes(query);
        const matchesRaw = entry.rawLine.toLowerCase().includes(query);
        return matchesMsg || matchesRaw;
      }

      return true;
    });
  });

  setLevelFilter(level: 'all' | 'error' | 'warn' | 'info' | 'debug') {
    this.activeLevel.set(level);
  }

  toggleExpand(entry: LogEntry) {
    this.parsedLogs.update(list => 
      list.map(e => e.id === entry.id ? { ...e, expanded: !e.expanded } : e)
    );
  }

  clearLogs() {
    this.rawLogs = '';
    this.parsedLogs.set([]);
  }

  // Format JSON metadata object nicely for printing
  formatMetadata(metadata: any): string {
    return JSON.stringify(metadata, null, 2);
  }
}
