// Server-side only functions for checking API keys
export function hasValidAPIKeys(): boolean {
  return !!process.env.OPENROUTER_API_KEY?.trim();
}

export function getMissingAPIKeys(): string[] {
  if (!process.env.OPENROUTER_API_KEY?.trim()) {
    return ['OPENROUTER_API_KEY'];
  }

  return [];
}
