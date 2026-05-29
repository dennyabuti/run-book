export interface JiraFetchConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraIssueContext {
  summary: string;
  description: string;
  acceptanceCriteria: string;
  linkedTicketKeys: string[];
}

export interface JiraEpicContext extends JiraIssueContext {
  epicKey: string;
  childIssueCount: number;
}

async function parseJsonOrError<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }
  return payload as T;
}

export async function fetchJiraIssueContext(
  issueKey: string,
  config: JiraFetchConfig,
): Promise<JiraIssueContext> {
  const response = await fetch("/api/jira/issue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ issueKey, config }),
  });

  return parseJsonOrError<JiraIssueContext>(response);
}

export async function fetchJiraEpicContext(
  epicKey: string,
  config: JiraFetchConfig,
): Promise<JiraEpicContext> {
  const response = await fetch("/api/jira/epic", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ epicKey, config }),
  });

  return parseJsonOrError<JiraEpicContext>(response);
}
