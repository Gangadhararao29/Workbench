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
  method = 'GET';
  endpoint = '/api/users';
  responseType = 'User[]';
  result = signal('');
  generate() {
    const name = this.endpoint.split('/').filter(Boolean).pop() || 'resource';
    const functionName = name.replace(/[-_](\w)/g, (_, letter) => letter.toUpperCase());
    if (this.framework === 'angular') this.result.set(`get${capitalize(functionName)}(): Observable<${this.responseType}> {\n  return this.http.${this.method.toLowerCase()}<${this.responseType}>('${this.endpoint}');\n}`);
    else if (this.framework === 'react') this.result.set(`export function use${capitalize(functionName)}() {\n  const [data, setData] = useState<${this.responseType} | null>(null);\n\n  useEffect(() => {\n    fetch('${this.endpoint}').then(response => response.json()).then(setData);\n  }, []);\n\n  return data;\n}`);
    else this.result.set(`export function use${capitalize(functionName)}() {\n  const data = ref<${this.responseType} | null>(null);\n\n  onMounted(async () => {\n    data.value = await fetch('${this.endpoint}').then(response => response.json());\n  });\n\n  return { data };\n}`);
  }
}
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
