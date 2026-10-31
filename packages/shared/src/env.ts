/** Read an environment variable, falling back to a default if it is not set. */
export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const BASE_URL = env('BASE_URL', 'https://playwright.dev');
