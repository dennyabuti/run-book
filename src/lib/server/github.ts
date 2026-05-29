import { GitHubPrContext } from "@/types/domain";

export interface GitHubFetchConfig {
  token?: string;
}

function parsePrUrl(prUrl: string): { owner: string; repo: string; number: number } {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(
      "Invalid GitHub PR URL. Expected format: https://github.com/{owner}/{repo}/pull/{number}",
    );
  }
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

export async function fetchGitHubPrContext(
  prUrl: string,
  config: GitHubFetchConfig,
): Promise<GitHubPrContext> {
  const { owner, repo, number } = parsePrUrl(prUrl);
  const baseUrl = "https://api.github.com";

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const prResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/pulls/${number}`, {
    headers,
    cache: "no-store",
  });

  if (!prResponse.ok) {
    if (prResponse.status === 401) {
      throw new Error("GitHub authentication failed. Check your token.");
    }
    if (prResponse.status === 404) {
      throw new Error(
        "GitHub PR not found. The repo may be private — add a token in Settings or set GITHUB_TOKEN in .env.",
      );
    }
    throw new Error(`GitHub request failed with status ${prResponse.status}.`);
  }

  const pr = (await prResponse.json()) as { title?: string; body?: string };

  const filesResponse = await fetch(
    `${baseUrl}/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`,
    { headers, cache: "no-store" },
  );
  const filesData = filesResponse.ok
    ? ((await filesResponse.json()) as Array<{ filename: string; status: string }>)
    : [];
  const changedFiles = filesData.map((f) => `${f.status}: ${f.filename}`);

  const commitsResponse = await fetch(
    `${baseUrl}/repos/${owner}/${repo}/pulls/${number}/commits?per_page=100`,
    { headers, cache: "no-store" },
  );
  const commitsData = commitsResponse.ok
    ? ((await commitsResponse.json()) as Array<{ commit: { message: string } }>)
    : [];
  const commitMessages = commitsData.map((c) => c.commit.message.split("\n")[0]);

  return {
    prUrl,
    title: pr.title ?? "",
    body: pr.body ?? "",
    changedFiles,
    commitMessages,
  };
}
