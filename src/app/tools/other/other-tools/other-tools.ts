import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ExternalToolItem {
  name: string;
  url: string;
  description: string;
  category: string;
  icon: string;
  tag: string;
}

export interface ExternalCategory {
  id: string;
  name: string;
  icon: string;
}

export const TOOL_CATEGORIES: ExternalCategory[] = [
  { id: 'all', name: 'All Tools', icon: 'apps' },
  { id: 'generators', name: 'Generators', icon: 'auto_awesome' },
  { id: 'image-resources', name: 'Image Resources', icon: 'photo_library' },
  { id: 'code-optimization', name: 'Code Optimization', icon: 'speed' },
  { id: 'converters', name: 'Converters', icon: 'transform' },
  { id: 'image-compression', name: 'Image Compression', icon: 'compress' },
  { id: 'validation', name: 'Validation & Compatibility', icon: 'verified' },
  { id: 'in-browser-coding', name: 'In Browser Coding', icon: 'terminal' },
  { id: 'snippet-tools', name: 'Snippet Tools', icon: 'content_paste' },
  { id: 'color-design', name: 'Color & Design', icon: 'palette' },
  { id: 'responsiveness', name: 'Responsiveness', icon: 'devices' },
  { id: 'wireframe', name: 'Wireframe', icon: 'architecture' },
  { id: 'speed-test', name: 'Speed Test', icon: 'bolt' },
  { id: 'other', name: 'Docs & APIs', icon: 'menu_book' },
];

export const EXTERNAL_TOOLS: ExternalToolItem[] = [
  // GENERATORS
  {
    name: 'Text Content Generator',
    url: 'http://www.lipsum.com',
    description: 'Standard Lorem Ipsum placeholder text, paragraphs, and dummy copy generator.',
    category: 'generators',
    icon: 'text_fields',
    tag: 'Dummy Text',
  },
  {
    name: 'Data Generator',
    url: 'https://mockaroo.com/',
    description: 'Generate realistic mock test data in CSV, JSON, SQL, or Excel formats.',
    category: 'generators',
    icon: 'database',
    tag: 'Mock Data',
  },
  {
    name: 'Mobile Mockup Generator',
    url: 'https://mockuphone.com',
    description: 'Wrap app screenshots into realistic iOS, Android, and desktop device mockups.',
    category: 'generators',
    icon: 'smartphone',
    tag: 'Device Frame',
  },
  {
    name: 'Logo Generator',
    url: 'https://www.logaster.com',
    description: 'Online brand identity and vector logo generator for startups and side projects.',
    category: 'generators',
    icon: 'token',
    tag: 'Branding',
  },
  {
    name: 'UUID Generator',
    url: 'https://www.uuidgenerator.net/',
    description: 'Generate single or bulk Version 1 and Version 4 UUIDs / GUIDs instantly.',
    category: 'generators',
    icon: 'fingerprint',
    tag: 'UUID / GUID',
  },
  {
    name: 'Hash Generator',
    url: 'https://passwordsgenerator.net/sha256-hash-generator/',
    description: 'Generate SHA-256 and cryptographic hash digests from plaintext strings.',
    category: 'generators',
    icon: 'tag',
    tag: 'Hashing',
  },
  {
    name: 'Ultimate Code Generator',
    url: 'https://webcode.tools/',
    description:
      'Visual generator for HTML5, CSS3, Twitter Cards, Open Graph, and Structured Data.',
    category: 'generators',
    icon: 'code',
    tag: 'Meta & CSS',
  },

  // IMAGE RESOURCES
  {
    name: 'Free Stock Images (Pexels)',
    url: 'https://www.pexels.com',
    description: 'High quality royalty-free stock photos and videos shared by creators.',
    category: 'image-resources',
    icon: 'photo_camera',
    tag: 'Stock Photos',
  },
  {
    name: 'Free Stock Images With Great API (Unsplash)',
    url: 'https://unsplash.com/',
    description: 'Beautiful free photography with developer API support.',
    category: 'image-resources',
    icon: 'image',
    tag: 'Photos & API',
  },
  {
    name: 'Free Vectors & Mockups (Freepik)',
    url: 'https://www.freepik.com',
    description:
      'Extensive library of graphic resources, vector art, illustrations, and PSD mockups.',
    category: 'image-resources',
    icon: 'draw',
    tag: 'Vectors & PSD',
  },
  {
    name: 'Dummy Image Placeholders (Source Unsplash)',
    url: 'https://source.unsplash.com/',
    description:
      'Embeddable photo placeholder URLs for embedding themed images during UI prototyping.',
    category: 'image-resources',
    icon: 'burst_mode',
    tag: 'Placeholder',
  },
  {
    name: 'Dummy Image Placeholders (Placeholder.com)',
    url: 'https://placeholder.com',
    description: 'Quick custom-sized graphic placeholder generator with dimensions and colors.',
    category: 'image-resources',
    icon: 'aspect_ratio',
    tag: 'Size Placeholder',
  },
  {
    name: 'Free Icons (Iconfinder)',
    url: 'https://www.iconfinder.com',
    description:
      'Search and download millions of SVG, PNG, and vector icons for websites and apps.',
    category: 'image-resources',
    icon: 'sentiment_satisfied',
    tag: 'Icon Library',
  },

  // CODE OPTIMIZATION
  {
    name: 'Minify JS & CSS',
    url: 'http://minifier.org',
    description: 'Fast, lightweight online minification engine for JavaScript and CSS stylesheets.',
    category: 'code-optimization',
    icon: 'compress',
    tag: 'Minification',
  },
  {
    name: 'Code Optimization Tools (CodeBeautify)',
    url: 'https://codebeautify.org',
    description:
      'All-in-one platform for code beautifying, minification, validation, and conversion.',
    category: 'code-optimization',
    icon: 'auto_fix_high',
    tag: 'Beautifier',
  },
  {
    name: 'Code Diff Checker',
    url: 'https://www.diffchecker.com',
    description:
      'Online diff tool to compare text differences between two files, code, or documents.',
    category: 'code-optimization',
    icon: 'difference',
    tag: 'Diff Tool',
  },

  // CONVERTERS
  {
    name: 'ES6+ & JSX Compiler (Babel REPL)',
    url: 'https://babeljs.io/repl',
    description: 'Interactive compiler REPL to experiment with next-gen ES6+ JavaScript and JSX.',
    category: 'converters',
    icon: 'javascript',
    tag: 'Babel / JSX',
  },
  {
    name: 'Sass Converter (SassMeister)',
    url: 'https://www.sassmeister.com/',
    description: 'Online playground to compile Sass / SCSS to standard CSS with live output.',
    category: 'converters',
    icon: 'css',
    tag: 'Sass / SCSS',
  },
  {
    name: 'Less Converter & More',
    url: 'http://www.webtoolkitonline.com',
    description:
      'Online web tools and converters for Less stylesheets, JSON, and string transforms.',
    category: 'converters',
    icon: 'swap_horiz',
    tag: 'Less / CSS',
  },
  {
    name: 'Markdown Editor (StackEdit)',
    url: 'https://stackedit.io',
    description: 'Full-featured, offline-ready in-browser Markdown editor with real-time preview.',
    category: 'converters',
    icon: 'article',
    tag: 'Markdown',
  },
  {
    name: 'Jade Converter (HTML2Jade)',
    url: 'http://www.html2jade.org/',
    description: 'Convert standard HTML markup into clean Jade / Pug template syntax.',
    category: 'converters',
    icon: 'html',
    tag: 'Pug / Jade',
  },

  // IMAGE COMPRESSION
  {
    name: 'Compress All Images (Compressor.io)',
    url: 'https://compressor.io/compress',
    description:
      'Powerful online tool for drastically reducing JPEG, PNG, SVG, GIF, and WEBP sizes.',
    category: 'image-compression',
    icon: 'photo_size_select_small',
    tag: 'Multi-Format',
  },
  {
    name: 'Compress JPG (JPEG Optimizer)',
    url: 'http://jpeg-optimizer.com/',
    description: 'Compress, optimize, and resize digital JPEG photos for web performance.',
    category: 'image-compression',
    icon: 'tune',
    tag: 'JPEG Only',
  },
  {
    name: 'Compress PNG (TinyPNG)',
    url: 'https://tinypng.com/',
    description: 'Smart lossy WebP, PNG, and JPEG compression trusted by millions worldwide.',
    category: 'image-compression',
    icon: 'image_search',
    tag: 'TinyPNG',
  },

  // VALIDATION & COMPATIBILITY
  {
    name: 'Validate HTML (W3C Validator)',
    url: 'https://validator.w3.org',
    description: 'Official W3C Markup Validation Service to check HTML/XHTML conformance.',
    category: 'validation',
    icon: 'fact_check',
    tag: 'W3C HTML',
  },
  {
    name: 'Validate CSS (W3C CSS Validator)',
    url: 'https://jigsaw.w3.org/css-validator',
    description: 'Official W3C Cascading Style Sheets (CSS) and (X)HTML document validator.',
    category: 'validation',
    icon: 'check_circle',
    tag: 'W3C CSS',
  },
  {
    name: 'Check Browser Compatibility (Can I use...)',
    url: 'https://caniuse.com/',
    description: 'Up-to-date browser feature support tables for modern HTML5, CSS3, and JS APIs.',
    category: 'validation',
    icon: 'visibility',
    tag: 'Browser Matrix',
  },
  {
    name: 'ES6+ Compatibility Table (Kangax)',
    url: 'https://kangax.github.io/compat-table/es6/',
    description: 'Detailed ECMAScript 6+ language feature compatibility matrix across JS engines.',
    category: 'validation',
    icon: 'table_chart',
    tag: 'ES6 Matrix',
  },

  // IN BROWSER CODING
  {
    name: 'Client Side Code (CodePen)',
    url: 'https://codepen.io',
    description:
      'Online development environment and social sandbox for frontend designers and devs.',
    category: 'in-browser-coding',
    icon: 'view_quilt',
    tag: 'Frontend Playground',
  },
  {
    name: 'Client Side Code (JSFiddle)',
    url: 'https://jsfiddle.net',
    description: 'Test and share JavaScript, CSS, HTML snippets with custom framework support.',
    category: 'in-browser-coding',
    icon: 'science',
    tag: 'Code Playground',
  },
  {
    name: 'Client Side Code (Liveweave)',
    url: 'http://liveweave.com',
    description: 'Real-time HTML5, CSS3, and JavaScript preview editor with built-in code hints.',
    category: 'in-browser-coding',
    icon: 'preview',
    tag: 'Live Editor',
  },
  {
    name: 'Server Side Code (Replit)',
    url: 'https://repl.it',
    description:
      'Collaborative browser IDE and cloud workspace for fullstack and backend languages.',
    category: 'in-browser-coding',
    icon: 'cloud_sync',
    tag: 'Cloud IDE',
  },

  // SNIPPET TOOLS
  {
    name: 'Snippet Manager (GitHub Gist)',
    url: 'https://gist.github.com',
    description: 'Instantly share, fork, and manage code snippets, configs, and notes using Git.',
    category: 'snippet-tools',
    icon: 'code_blocks',
    tag: 'GitHub Gist',
  },
  {
    name: 'Snippet Manager (Pastebin)',
    url: 'https://pastebin.com',
    description: 'Popular online text storage website to quickly share text, logs, and code.',
    category: 'snippet-tools',
    icon: 'assignment',
    tag: 'Pastebin',
  },

  // COLOR & DESIGN
  {
    name: 'Create Color Schemes (Hailpixel Color)',
    url: 'https://color.hailpixel.com',
    description: 'Color Dot: interactive cursor and gesture-based color palette discovery tool.',
    category: 'color-design',
    icon: 'colorize',
    tag: 'Palette',
  },
  {
    name: 'Get Color Schemes of Websites (Stylify Me)',
    url: 'http://stylifyme.com',
    description: 'Online style guide generator extracting colors, fonts, and styles from any URL.',
    category: 'color-design',
    icon: 'palette',
    tag: 'Style Guide',
  },
  {
    name: 'Create Gradients (uiGradients)',
    url: 'https://uigradients.com',
    description: 'Curated collection of gorgeous linear and radial CSS color gradients.',
    category: 'color-design',
    icon: 'gradient',
    tag: 'Gradients',
  },
  {
    name: 'CSS Button Generator',
    url: 'http://css3buttongenerator.com',
    description: 'Visual styling tool to design, customize, and export cross-browser CSS3 buttons.',
    category: 'color-design',
    icon: 'smart_button',
    tag: 'CSS Buttons',
  },
  {
    name: 'HTML Entity Lookup',
    url: 'http://entity-lookup.leftlogic.com/',
    description: 'Fast, real-time search engine for named HTML character entities and unicode.',
    category: 'color-design',
    icon: 'find_in_page',
    tag: 'HTML Entities',
  },

  // RESPONSIVENESS
  {
    name: 'Device Testing (Responsinator)',
    url: 'http://www.responsinator.com',
    description:
      'Test responsive web pages across simulated popular iPhone, iPad, and Android screens.',
    category: 'responsiveness',
    icon: 'devices_other',
    tag: 'Device Preview',
  },
  {
    name: "What's My Browser Size",
    url: 'https://www.webpagefx.com/tools/whats-my-browser-size/',
    description: 'Instantly view your current viewport size, screen resolution, and color depth.',
    category: 'responsiveness',
    icon: 'aspect_ratio',
    tag: 'Viewport Test',
  },

  // WIREFRAME
  {
    name: 'In Browser Wireframing (Moqups)',
    url: 'https://app.moqups.com',
    description: 'Collaborative online wireframing, mockup design, and UI diagramming platform.',
    category: 'wireframe',
    icon: 'design_services',
    tag: 'UI Mockups',
  },
  {
    name: 'Very Basic In Browser Wireframing (Wireframe.cc)',
    url: 'https://wireframe.cc',
    description: 'Super-clean, minimal wireframe app to sketch layout ideas without distractions.',
    category: 'wireframe',
    icon: 'crop_free',
    tag: 'Wireframing',
  },

  // SPEED TEST
  {
    name: 'Speed & Performance Testing (KeyCDN)',
    url: 'https://tools.keycdn.com/speed',
    description: 'Full page speed test and TTFB performance benchmark from 10+ global locations.',
    category: 'speed-test',
    icon: 'speed',
    tag: 'Page Speed',
  },
  {
    name: 'Pingdom Speed Test',
    url: 'https://tools.pingdom.com/',
    description: 'Analyze page load speed, page size, HTTP requests, and performance grade.',
    category: 'speed-test',
    icon: 'timer',
    tag: 'Pingdom',
  },

  // OTHER
  {
    name: 'Public API Resources',
    url: 'https://github.com/toddmotto/public-apis?utm_source=mybridge&utm_medium=blog&utm_campaign=read_more',
    description: 'Extensive, categorized directory of free APIs for software and web developers.',
    category: 'other',
    icon: 'api',
    tag: 'Public APIs',
  },
  {
    name: 'Organized Docs for Popular Web Tech (DevDocs)',
    url: 'https://devdocs.io',
    description:
      'Fast, offline, and mobile-friendly documentation browser for 100+ web frameworks.',
    category: 'other',
    icon: 'menu_book',
    tag: 'DevDocs',
  },
];

@Component({
  selector: 'app-other-tools',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule],
  templateUrl: './other-tools.html',
  styleUrls: ['./other-tools.css'],
})
export class OtherTools {
  @Input({ required: true }) instanceId!: string;

  categories = TOOL_CATEGORIES;
  tools = EXTERNAL_TOOLS;

  searchQuery = signal<string>('');
  activeCategory = signal<string>('all');
  copiedUrl = signal<string | null>(null);
  favoriteUrls = signal<string[]>(this.loadFavorites());

  // Filtered tools list
  filteredTools = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.activeCategory();

    return this.tools.filter((t) => {
      const matchesCategory = cat === 'all' || t.category === cat;
      if (!matchesCategory) return false;

      if (!q) return true;

      const searchable = `${t.name} ${t.description} ${t.url} ${t.tag} ${t.category}`.toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      return terms.every((term) => searchable.includes(term));
    });
  });

  // Starred / pinned tools
  starredTools = computed(() => {
    const favs = new Set(this.favoriteUrls());
    return this.tools.filter((t) => favs.has(t.url));
  });

  // Grouped tools for display when 'all' is selected and no search
  groupedTools = computed(() => {
    const activeTools = this.filteredTools();
    const groups: { category: ExternalCategory; tools: ExternalToolItem[] }[] = [];

    for (const cat of this.categories) {
      if (cat.id === 'all') continue;
      const catTools = activeTools.filter((t) => t.category === cat.id);
      if (catTools.length > 0) {
        groups.push({ category: cat, tools: catTools });
      }
    }
    return groups;
  });

  selectCategory(id: string): void {
    this.activeCategory.set(id);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.activeCategory.set('all');
  }

  getDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  getCategoryCount(catId: string): number {
    if (catId === 'all') return this.tools.length;
    return this.tools.filter((t) => t.category === catId).length;
  }

  async copyUrl(url: string, event?: Event): Promise<void> {
    event?.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // Fallback or ignore
    }
    this.copiedUrl.set(url);
    setTimeout(() => {
      if (this.copiedUrl() === url) {
        this.copiedUrl.set(null);
      }
    }, 2000);
  }

  toggleFavorite(url: string, event?: Event): void {
    event?.stopPropagation();
    const current = new Set(this.favoriteUrls());
    if (current.has(url)) {
      current.delete(url);
    } else {
      current.add(url);
    }
    const updated = Array.from(current);
    this.favoriteUrls.set(updated);
    this.saveFavorites(updated);
  }

  isFavorite(url: string): boolean {
    return this.favoriteUrls().includes(url);
  }

  private loadFavorites(): string[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('workbench_fav_external_tools');
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Ignore
    }
    return [];
  }

  private saveFavorites(urls: string[]): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('workbench_fav_external_tools', JSON.stringify(urls));
      }
    } catch {
      // Ignore
    }
  }
}
