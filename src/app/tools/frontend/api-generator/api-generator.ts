import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-api-generator', standalone: true, imports: [FormsModule, MatButtonModule],
  templateUrl: './api-generator.html', styleUrls: ['./api-generator.css']
})
export class ApiGenerator {
  @Input({ required: true }) instanceId!: string;
  framework: 'angular' | 'react' | 'vue' = 'angular';
  angularPattern: 'service-method' | 'full-service' | 'signals-resource' = 'service-method';
  reactPattern: 'custom-hook' | 'rtk-query' | 'redux-thunk' = 'custom-hook';
  vuePattern: 'composable' | 'pinia-store' | 'context-provider' = 'composable';
  method = 'GET';
  endpoint = '/api/users';
  responseType = 'User[]';
  result = signal('');

  generate() {
    const name = this.endpoint.split('/').filter(Boolean).pop() || 'resource';
    const camelName = name.replace(/[-_](\w)/g, (_, letter) => letter.toUpperCase());
    const pascalName = capitalize(camelName);
    const methodLower = this.method.toLowerCase();
    const cleanResponseType = this.responseType.trim() || 'any';
    const baseModelType = cleanResponseType.replace(/\[\]$/, '');
    const serviceName = `${pascalName}Service`;

    if (this.framework === 'angular') {
      if (this.angularPattern === 'service-method') {
        this.result.set(`get${pascalName}(): Observable<${cleanResponseType}> {\n  return this.http.${methodLower}<${cleanResponseType}>('${this.endpoint}');\n}`);
      } else if (this.angularPattern === 'full-service') {
        this.result.set(`import { Injectable, inject } from '@angular/core';\nimport { HttpClient } from '@angular/common/http';\nimport { Observable } from 'rxjs';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class ${serviceName} {\n  private http = inject(HttpClient);\n  private baseUrl = '${this.endpoint}';\n\n  get${pascalName}(): Observable<${cleanResponseType}> {\n    return this.http.${methodLower}<${cleanResponseType}>(this.baseUrl);\n  }\n}`);
      } else if (this.angularPattern === 'signals-resource') {
        this.result.set(`import { Injectable, inject } from '@angular/core';\nimport { HttpClient } from '@angular/common/http';\nimport { rxResource } from '@angular/core/rxjs-interop';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class ${serviceName} {\n  private http = inject(HttpClient);\n\n  ${camelName}Resource = rxResource({\n    loader: () => this.http.${methodLower}<${cleanResponseType}>('${this.endpoint}')\n  });\n\n  // To read state in components:\n  // data = this.${camelName}Resource.value;\n  // loading = this.${camelName}Resource.isLoading;\n}`);
      }
    } else if (this.framework === 'react') {
      if (this.reactPattern === 'custom-hook') {
        this.result.set(`import { useState, useEffect } from 'react';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\nexport function use${pascalName}() {\n  const [data, setData] = useState<${cleanResponseType} | null>(null);\n  const [loading, setLoading] = useState<boolean>(true);\n  const [error, setError] = useState<Error | null>(null);\n\n  useEffect(() => {\n    const controller = new AbortController();\n    setLoading(true);\n\n    fetch('${this.endpoint}', { signal: controller.signal })\n      .then(res => {\n        if (!res.ok) throw new Error(\`HTTP error! status: \${res.status}\`);\n        return res.json();\n      })\n      .then(setData)\n      .catch(err => {\n        if (err.name !== 'AbortError') setError(err);\n      })\n      .finally(() => setLoading(false));\n\n    return () => controller.abort();\n  }, []);\n\n  return { data, loading, error };\n}`);
      } else if (this.reactPattern === 'rtk-query') {
        this.result.set(`import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\nexport const ${camelName}Api = createApi({\n  reducerPath: '${camelName}Api',\n  baseQuery: fetchBaseQuery({ baseUrl: '/' }),\n  endpoints: (builder) => ({\n    get${pascalName}: builder.query<${cleanResponseType}, void>({\n      query: () => '${this.endpoint}',\n    }),\n  }),\n});\n\nexport const { useGet${pascalName}Query } = ${camelName}Api;`);
      } else if (this.reactPattern === 'redux-thunk') {
        this.result.set(`import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\nexport const fetch${pascalName} = createAsyncThunk(\n  '${camelName}/fetch${pascalName}',\n  async (_, thunkAPI) => {\n    try {\n      const response = await fetch('${this.endpoint}');\n      if (!response.ok) throw new Error('Network response was not ok');\n      return (await response.json()) as ${cleanResponseType};\n    } catch (error: any) {\n      return thunkAPI.rejectWithValue(error.message || 'Failed to fetch');\n    }\n  }\n);\n\ninterface State {\n  data: ${cleanResponseType} | null;\n  loading: boolean;\n  error: string | null;\n}\n\nconst initialState: State = {\n  data: null,\n  loading: false,\n  error: null,\n};\n\nconst ${camelName}Slice = createSlice({\n  name: '${camelName}',\n  initialState,\n  reducers: {},\n  extraReducers: (builder) => {\n    builder\n      .addCase(fetch${pascalName}.pending, (state) => {\n        state.loading = true;\n        state.error = null;\n      })\n      .addCase(fetch${pascalName}.fulfilled, (state, action: PayloadAction<${cleanResponseType}>) => {\n        state.loading = false;\n        state.data = action.payload;\n      })\n      .addCase(fetch${pascalName}.rejected, (state, action) => {\n        state.loading = false;\n        state.error = action.payload as string || 'Unknown error';\n      });\n  },\n});\n\nexport default ${camelName}Slice.reducer;`);
      }
    } else if (this.framework === 'vue') {
      if (this.vuePattern === 'composable') {
        this.result.set(`import { ref, onMounted } from 'vue';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\nexport function use${pascalName}() {\n  const data = ref<${cleanResponseType} | null>(null);\n  const loading = ref(false);\n  const error = ref<Error | null>(null);\n\n  const fetchData = async () => {\n    loading.value = true;\n    try {\n      const res = await fetch('${this.endpoint}');\n      if (!res.ok) throw new Error(\`HTTP error! status: \n\${res.status}\`);\n      data.value = await res.json();\n    } catch (err) {\n      error.value = err as Error;\n    } finally {\n      loading.value = false;\n    }\n  };\n\n  onMounted(fetchData);\n\n  return { data, loading, error, refetch: fetchData };\n}`);
      } else if (this.vuePattern === 'pinia-store') {
        this.result.set(`import { defineStore } from 'pinia';\nimport { ref } from 'vue';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\nexport const use${pascalName}Store = defineStore('${camelName}', () => {\n  const data = ref<${cleanResponseType} | null>(null);\n  const loading = ref(false);\n  const error = ref<string | null>(null);\n\n  async function fetch${pascalName}() {\n    loading.value = true;\n    error.value = null;\n    try {\n      const res = await fetch('${this.endpoint}');\n      if (!res.ok) throw new Error('Failed to fetch data');\n      data.value = await res.json();\n    } catch (err: any) {\n      error.value = err.message || 'Unknown error';\n    }\n    finally {\n      loading.value = false;\n    }\n  }\n\n  return { data, loading, error, fetch${pascalName} };\n});`);
      } else if (this.vuePattern === 'context-provider') {
        this.result.set(`import { inject, provide, InjectionKey } from 'vue';\n\nexport interface ${baseModelType} {\n  // Define fields here\n}\n\nexport class ${pascalName}ApiClient {\n  async fetch(): Promise<${cleanResponseType}> {\n    const res = await fetch('${this.endpoint}');\n    if (!res.ok) throw new Error('Fetch failed');\n    return res.json();\n  }\n}\n\nconst ApiClientKey: InjectionKey<${pascalName}ApiClient> = Symbol('${pascalName}ApiClientKey');\n\nexport function provide${pascalName}ApiClient() {\n  provide(ApiClientKey, new ${pascalName}ApiClient());\n}\n\nexport function use${pascalName}ApiClient() {\n  const client = inject(ApiClientKey);\n  if (!client) throw new Error('${pascalName}ApiClient not provided');\n  return client;\n}`);
      }
    }
  }
}
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
