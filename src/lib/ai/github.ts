import { GitHubPrContext } from "@/types/domain";

export interface GitHubFetchConfig {
  token?: string;
}

async function parseJsonOrError<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }
  return payload as T;
}

export async function fetchGitHubPrContext(
  prUrl: string,
  config: GitHubFetchConfig,
): Promise<GitHubPrContext> {
  const response = await fetch("/api/github/pr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prUrl, config }),
  });

  return parseJsonOrError<GitHubPrContext>(response);
}
