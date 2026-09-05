import { dump, load, loadAll } from 'js-yaml';
import { formatJson } from './json-engine';

export interface YamlToConvertOptions {
  indent?: number;
  sortKeys?: boolean;
  quotingType?: 'none' | 'single' | 'double';
  forceQuotes?: boolean;
  flowLevel?: number;
  noRefs?: boolean;
  lineWidth?: number;
}

export interface JsonOutputOptions {
  indent?: number;
  sortKeys?: boolean;
  compact?: boolean;
}

export interface YamlPreset {
  name: string;
  description: string;
  json: string;
  yaml: string;
}

/**
 * Converts a JSON string to a YAML formatted string.
 */
export function jsonToYaml(jsonStr: string, options: YamlToConvertOptions = {}): string {
  if (!jsonStr || !jsonStr.trim()) {
    return '';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Invalid JSON input: ${(err as Error).message}`);
  }

  const dumpOptions: Record<string, any> = {
    indent: options.indent ?? 2,
    sortKeys: options.sortKeys ?? false,
    noRefs: options.noRefs ?? true,
    lineWidth: options.lineWidth ?? 120,
  };

  if (options.quotingType === 'single') {
    dumpOptions['quoteStyle'] = 'single';
    dumpOptions['quotingType'] = "'";
  } else if (options.quotingType === 'double') {
    dumpOptions['quoteStyle'] = 'double';
    dumpOptions['quotingType'] = '"';
  }

  if (options.forceQuotes) {
    dumpOptions['forceQuotes'] = true;
  }

  if (typeof options.flowLevel === 'number' && options.flowLevel >= 0) {
    dumpOptions['flowLevel'] = options.flowLevel;
  }

  try {
    return dump(parsed, dumpOptions);
  } catch (err) {
    throw new Error(`YAML serialization failed: ${(err as Error).message}`);
  }
}

/**
 * Converts a YAML string to a formatted JSON string.
 */
export function yamlToJson(yamlStr: string, options: JsonOutputOptions = {}): string {
  if (!yamlStr || !yamlStr.trim()) {
    return '';
  }

  let parsed: unknown;
  try {
    // Check if multi-document
    const documents: unknown[] = [];
    loadAll(yamlStr, doc => {
      if (doc !== undefined) {
        documents.push(doc);
      }
    });

    if (documents.length === 0) {
      parsed = load(yamlStr);
    } else if (documents.length === 1) {
      parsed = documents[0];
    } else {
      parsed = documents;
    }
  } catch (err) {
    throw new Error(`Invalid YAML input: ${(err as Error).message}`);
  }

  return formatJson(parsed, {
    indent: options.indent ?? 2,
    compact: options.compact,
    sortKeys: options.sortKeys,
  });
}

/**
 * Heuristic format detector for auto-detecting if input is likely JSON or YAML
 */
export function detectFormat(content: string): 'json' | 'yaml' | 'unknown' {
  const trimmed = content.trim();
  if (!trimmed) return 'unknown';

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Might still be YAML or malformed JSON
    }
  }

  try {
    load(trimmed);
    return 'yaml';
  } catch {
    return 'unknown';
  }
}

export const YAML_PRESETS: YamlPreset[] = [
  {
    name: 'App Config',
    description: 'Standard microservice app settings & database connection config',
    json: JSON.stringify(
      {
        appName: 'payment-gateway',
        environment: 'production',
        port: 8080,
        logging: {
          level: 'info',
          format: 'json',
          enableTracing: true
        },
        database: {
          host: 'db.prod.internal',
          port: 5432,
          name: 'payments',
          ssl: true,
          poolSize: 20
        },
        features: {
          instantSettlement: true,
          cryptoSupport: false,
          maxRetryAttempts: 3
        },
        allowedOrigins: ['https://app.example.com', 'https://admin.example.com']
      },
      null,
      2
    ),
    yaml: `appName: payment-gateway
environment: production
port: 8080
logging:
  level: info
  format: json
  enableTracing: true
database:
  host: db.prod.internal
  port: 5432
  name: payments
  ssl: true
  poolSize: 20
features:
  instantSettlement: true
  cryptoSupport: false
  maxRetryAttempts: 3
allowedOrigins:
  - https://app.example.com
  - https://admin.example.com
`
  },
  {
    name: 'Kubernetes Pod',
    description: 'K8s Deployment spec with containers, replicas, and probes',
    json: JSON.stringify(
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name: 'web-api-deployment',
          labels: {
            app: 'web-api',
            tier: 'backend'
          }
        },
        spec: {
          replicas: 3,
          selector: {
            matchLabels: {
              app: 'web-api'
            }
          },
          template: {
            metadata: {
              labels: {
                app: 'web-api'
              }
            },
            spec: {
              containers: [
                {
                  name: 'web-api',
                  image: 'ghcr.io/org/web-api:v2.4.1',
                  ports: [{ containerPort: 8080 }],
                  env: [
                    { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' },
                    { name: 'DOTNET_RUNNING_IN_CONTAINER', value: 'true' }
                  ],
                  resources: {
                    limits: { memory: '512Mi', cpu: '500m' },
                    requests: { memory: '256Mi', cpu: '250m' }
                  }
                }
              ]
            }
          }
        }
      },
      null,
      2
    ),
    yaml: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api-deployment
  labels:
    app: web-api
    tier: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
    spec:
      containers:
        - name: web-api
          image: ghcr.io/org/web-api:v2.4.1
          ports:
            - containerPort: 8080
          env:
            - name: ASPNETCORE_ENVIRONMENT
              value: Production
            - name: DOTNET_RUNNING_IN_CONTAINER
              value: 'true'
          resources:
            limits:
              memory: 512Mi
              cpu: 500m
            requests:
              memory: 256Mi
              cpu: 250m
`
  },
  {
    name: 'GitHub Action',
    description: 'CI/CD pipeline workflow configuration',
    json: JSON.stringify(
      {
        name: 'Build and Test',
        on: {
          push: { branches: ['main'] },
          pull_request: { branches: ['main'] }
        },
        jobs: {
          test: {
            name: 'Run Unit Tests',
            runsOn: 'ubuntu-latest',
            steps: [
              { name: 'Checkout Code', uses: 'actions/checkout@v4' },
              {
                name: 'Setup Node.js',
                uses: 'actions/setup-node@v4',
                with: { 'node-version': 20, cache: 'npm' }
              },
              { name: 'Install dependencies', run: 'npm ci' },
              { name: 'Run test suite', run: 'npm test -- --coverage' }
            ]
          }
        }
      },
      null,
      2
    ),
    yaml: `name: Build and Test
'on':
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
jobs:
  test:
    name: Run Unit Tests
    runsOn: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Run test suite
        run: npm test -- --coverage
`
  },
  {
    name: 'Docker Compose',
    description: 'Multi-container application services setup',
    json: JSON.stringify(
      {
        version: '3.8',
        services: {
          web: {
            build: '.',
            ports: ['3000:3000'],
            environment: {
              NODE_ENV: 'development',
              REDIS_HOST: 'cache'
            },
            depends_on: ['cache', 'db']
          },
          cache: {
            image: 'redis:7-alpine',
            ports: ['6379:6379']
          },
          db: {
            image: 'postgres:16-alpine',
            environment: {
              POSTGRES_USER: 'postgres',
              POSTGRES_PASSWORD: 'secretpassword',
              POSTGRES_DB: 'app_db'
            },
            volumes: ['pgdata:/var/lib/postgresql/data']
          }
        },
        volumes: {
          pgdata: {}
        }
      },
      null,
      2
    ),
    yaml: `version: '3.8'
services:
  web:
    build: .
    ports:
      - '3000:3000'
    environment:
      NODE_ENV: development
      REDIS_HOST: cache
    depends_on:
      - cache
      - db
  cache:
    image: redis:7-alpine
    ports:
      - '6379:6379'
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: app_db
    volumes:
      - 'pgdata:/var/lib/postgresql/data'
volumes:
  pgdata: {}
`
  }
];
