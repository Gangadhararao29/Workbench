import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  TimestampInputUnit,
  parseTimestampInput,
  formatAllTimestampOutputs,
  getTimezoneConversions,
  applyDateArithmetic,
  calculateDateDifference,
  getDeveloperCodeSnippets,
  POPULAR_TIMEZONES,
  TimezoneInfo,
  FormattedTimestampOutputs,
} from '../../../core/engines/timestamp-engine';
import { InstanceService } from '../../../core/tool/tool-instance';

@Component({
  selector: 'app-timestamp-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './timestamp-converter.html',
  styleUrls: ['./timestamp-converter.css'],
})
export class TimestampConverter implements OnInit, OnDestroy {
  @Input({ required: true }) instanceId!: string;

  private instanceService = inject(InstanceService);

  // Tabs: 'convert' | 'timezones' | 'math' | 'snippets'
  activeTab = signal<'convert' | 'timezones' | 'math' | 'snippets'>('convert');

  // Live Ticker State
  liveNow = signal<Date>(new Date());
  tickerRunning = signal<boolean>(true);
  private timerId: any = null;

  // Main Converter State
  input = signal<string>(Math.floor(Date.now() / 1000).toString());
  unit = signal<TimestampInputUnit>('auto');

  // Timezone search/filter
  timezoneQuery = signal<string>('');

  // Date Adjuster Fields
  adjusterMode = signal<'local' | 'utc'>('local');
  adjYear = signal<number>(new Date().getFullYear());
  adjMonth = signal<number>(new Date().getMonth() + 1);
  adjDay = signal<number>(new Date().getDate());
  adjHour = signal<number>(new Date().getHours());
  adjMinute = signal<number>(new Date().getMinutes());
  adjSecond = signal<number>(new Date().getSeconds());

  // Date Math State
  mathOp = signal<'add' | 'subtract'>('add');
  mathYears = signal<number>(0);
  mathMonths = signal<number>(0);
  mathDays = signal<number>(7);
  mathHours = signal<number>(0);
  mathMinutes = signal<number>(0);
  mathSeconds = signal<number>(0);

  // Date Difference State
  diffDateA = signal<string>('now');
  diffDateB = signal<string>('+7d');

  // Copy Feedback
  copiedField = signal<string | null>(null);
  private copyTimeout: any = null;

  // Computed Live Outputs
  liveData = computed(() => {
    return formatAllTimestampOutputs(this.liveNow());
  });

  // Computed Parse Result
  parsedResult = computed(() => {
    return parseTimestampInput(this.input(), this.unit());
  });

  // Computed Active Formatted Outputs
  activeOutputs = computed<FormattedTimestampOutputs | null>(() => {
    const res = this.parsedResult();
    if (!res.isValid) return null;
    return formatAllTimestampOutputs(res.date);
  });

  // Timezones for the active date
  allTimezones = computed<TimezoneInfo[]>(() => {
    const date = this.parsedResult().isValid ? this.parsedResult().date : this.liveNow();
    return getTimezoneConversions(date, POPULAR_TIMEZONES);
  });

  filteredTimezones = computed<TimezoneInfo[]>(() => {
    const q = this.timezoneQuery().toLowerCase().trim();
    const list = this.allTimezones();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.offsetFormatted.toLowerCase().includes(q),
    );
  });

  // Date Math Output
  mathCalculatedDate = computed<Date>(() => {
    const baseDate = this.parsedResult().isValid ? this.parsedResult().date : new Date();
    const multiplier = this.mathOp() === 'add' ? 1 : -1;
    return applyDateArithmetic(baseDate, {
      years: this.mathYears() * multiplier,
      months: this.mathMonths() * multiplier,
      days: this.mathDays() * multiplier,
      hours: this.mathHours() * multiplier,
      minutes: this.mathMinutes() * multiplier,
      seconds: this.mathSeconds() * multiplier,
    });
  });

  mathOutputs = computed(() => {
    return formatAllTimestampOutputs(this.mathCalculatedDate());
  });

  // Date Diff Output
  diffCalculatedResult = computed(() => {
    const parseA = parseTimestampInput(this.diffDateA(), 'auto');
    const parseB = parseTimestampInput(this.diffDateB(), 'auto');

    if (!parseA.isValid || !parseB.isValid) {
      return {
        isValid: false,
        error: !parseA.isValid
          ? `Date A is invalid: ${parseA.errorMessage}`
          : `Date B is invalid: ${parseB.errorMessage}`,
        result: null,
      };
    }

    return {
      isValid: true,
      error: null,
      result: calculateDateDifference(parseA.date, parseB.date),
      dateAFormatted: parseA.date.toISOString(),
      dateBFormatted: parseB.date.toISOString(),
    };
  });

  // Developer Snippets
  developerSnippets = computed(() => {
    const date = this.parsedResult().isValid ? this.parsedResult().date : this.liveNow();
    return getDeveloperCodeSnippets(date);
  });

  constructor() {
    // Sync interactive adjustment controls whenever parsedResult or adjusterMode updates
    effect(() => {
      this.syncAdjusterFields();
    });
  }

  setAdjusterMode(mode: 'local' | 'utc') {
    this.adjusterMode.set(mode);
    this.syncAdjusterFields();
  }

  private syncAdjusterFields() {
    const res = this.parsedResult();
    if (res.isValid) {
      const d = res.date;
      if (this.adjusterMode() === 'utc') {
        this.adjYear.set(d.getUTCFullYear());
        this.adjMonth.set(d.getUTCMonth() + 1);
        this.adjDay.set(d.getUTCDate());
        this.adjHour.set(d.getUTCHours());
        this.adjMinute.set(d.getUTCMinutes());
        this.adjSecond.set(d.getUTCSeconds());
      } else {
        this.adjYear.set(d.getFullYear());
        this.adjMonth.set(d.getMonth() + 1);
        this.adjDay.set(d.getDate());
        this.adjHour.set(d.getHours());
        this.adjMinute.set(d.getMinutes());
        this.adjSecond.set(d.getSeconds());
      }
    }
  }

  ngOnInit() {
    this.startTicker();
  }

  ngOnDestroy() {
    this.stopTicker();
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
  }

  setTab(tab: 'convert' | 'timezones' | 'math' | 'snippets') {
    this.activeTab.set(tab);
  }

  startTicker() {
    this.tickerRunning.set(true);
    this.timerId = setInterval(() => {
      this.liveNow.set(new Date());
    }, 1000);
  }

  stopTicker() {
    this.tickerRunning.set(false);
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  toggleTicker() {
    if (this.tickerRunning()) {
      this.stopTicker();
    } else {
      this.liveNow.set(new Date());
      this.startTicker();
    }
  }

  useCurrentTime() {
    const nowSec = Math.floor(Date.now() / 1000).toString();
    this.input.set(nowSec);
    this.unit.set('auto');
  }

  useIsoNow() {
    this.input.set(new Date().toISOString());
    this.unit.set('iso');
  }

  setPreset(preset: string) {
    const now = new Date();
    switch (preset) {
      case 'now':
        this.input.set(Math.floor(Date.now() / 1000).toString());
        break;
      case 'start_today': {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'end_today': {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 0);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'start_month': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'start_year': {
        const d = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'plus_1h': {
        const d = new Date(Date.now() + 3600 * 1000);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'plus_1d': {
        const d = new Date(Date.now() + 24 * 3600 * 1000);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'plus_7d': {
        const d = new Date(Date.now() + 7 * 24 * 3600 * 1000);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
      case 'minus_1d': {
        const d = new Date(Date.now() - 24 * 3600 * 1000);
        this.input.set(Math.floor(d.getTime() / 1000).toString());
        break;
      }
    }
  }

  applyAdjuster() {
    try {
      let d: Date;
      if (this.adjusterMode() === 'utc') {
        const utcMs = Date.UTC(
          this.adjYear(),
          this.adjMonth() - 1,
          this.adjDay(),
          this.adjHour(),
          this.adjMinute(),
          this.adjSecond(),
        );
        d = new Date(utcMs);
      } else {
        d = new Date(
          this.adjYear(),
          this.adjMonth() - 1,
          this.adjDay(),
          this.adjHour(),
          this.adjMinute(),
          this.adjSecond(),
        );
      }
      if (!Number.isNaN(d.getTime())) {
        this.input.set(Math.floor(d.getTime() / 1000).toString());
      }
    } catch {
      // ignore
    }
  }

  async copyText(text: string, key: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copiedField.set(key);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => {
        this.copiedField.set(null);
      }, 2000);
    } catch {
      // Fallback
    }
  }

  isCopied(key: string): boolean {
    return this.copiedField() === key;
  }
}
