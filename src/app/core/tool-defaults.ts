import { getToolDefinition } from './tool-registry';

export function defaultConfigFor(toolType: string): Record<string, any> {
  const tool = getToolDefinition(toolType);
  if (!tool || !tool.defaultConfig) return {};
  return JSON.parse(JSON.stringify(tool.defaultConfig));
}