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

interface JiraIssueSummary {
  key: string;
  summary: string;
  description: string;
  acceptanceCriteria: string;
}

function buildAuthHeader(config: JiraFetchConfig): string {
  const token = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");
  return `Basic ${token}`;
}

function extractText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => extractText(item)).filter(Boolean).join("\n").trim();
  }

  if (typeof value === "object") {
    const node = value as Record<string, unknown>;
    const text = typeof node.text === "string" ? node.text : "";
    const content = extractText(node.content);
    const separator = node.type === "paragraph" || node.type === "heading" ? "\n" : "";
    return `${text}${text && content ? " " : ""}${content}${separator}`.trim();
  }

  return "";
}

function mapIssueToSummary(issue: Record<string, unknown>): JiraIssueSummary {
  const fields = (issue.fields as Record<string, unknown>) ?? {};
  return {
    key: String(issue.key ?? ""),
    summary: typeof fields.summary === "string" ? fields.summary : "",
    description: extractText(fields.description),
    acceptanceCriteria: extractText(fields.customfield_10000),
  };
}

async function fetchIssue(issueKey: string, config: JiraFetchConfig): Promise<JiraIssueSummary> {
  const url = `${config.baseUrl.replace(/\/$/, "")}/rest/api/3/issue/${issueKey}`;

  const response = await fetch(url, {
    headers: {
      Authorization: buildAuthHeader(config),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Jira request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return mapIssueToSummary(data);
}

async function searchIssuesByJql(jql: string, config: JiraFetchConfig): Promise<JiraIssueSummary[]> {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const results: JiraIssueSummary[] = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=${encodeURIComponent("summary,description,customfield_10000")}`;
    const response = await fetch(url, {
      headers: {
        Authorization: buildAuthHeader(config),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 400) {
        return [];
      }
      throw new Error(`Jira search failed with status ${response.status}.`);
    }

    const data = (await response.json()) as { issues?: Array<Record<string, unknown>>; total?: number };
    const issues = data.issues ?? [];
    results.push(...issues.map(mapIssueToSummary));

    startAt += issues.length;
    const total = data.total ?? 0;
    if (issues.length === 0 || startAt >= total) {
      break;
    }
  }

  return results;
}

export async function fetchJiraIssueContext(issueKey: string, config: JiraFetchConfig): Promise<JiraIssueContext> {
  const issue = await fetchIssue(issueKey, config);

  return {
    summary: issue.summary,
    description: issue.description,
    acceptanceCriteria: issue.acceptanceCriteria,
    linkedTicketKeys: issue.key ? [issue.key] : [],
  };
}

export async function fetchJiraEpicContext(epicKey: string, config: JiraFetchConfig): Promise<JiraEpicContext> {
  const epic = await fetchIssue(epicKey, config);

  const strategies = [
    `"Epic Link" = ${epicKey}`,
    `parentEpic = ${epicKey}`,
    `parent = ${epicKey}`,
  ];

  const deduped = new Map<string, JiraIssueSummary>();
  for (const strategy of strategies) {
    const children = await searchIssuesByJql(strategy, config);
    for (const child of children) {
      if (child.key && child.key !== epicKey) {
        deduped.set(child.key, child);
      }
    }
  }

  const childIssues = [...deduped.values()];
  const childLines = childIssues.map((child) => `- ${child.key}: ${child.summary}`);
  const acceptanceLines = childIssues
    .filter((child) => child.acceptanceCriteria)
    .map((child) => `- ${child.key}: ${child.acceptanceCriteria}`);

  return {
    epicKey,
    summary: epic.summary,
    description: [
      epic.description,
      childLines.length > 0 ? `Epic Tickets:\n${childLines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    acceptanceCriteria: [
      epic.acceptanceCriteria,
      acceptanceLines.length > 0 ? `Ticket Acceptance Criteria:\n${acceptanceLines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    linkedTicketKeys: childIssues.map((child) => child.key),
    childIssueCount: childIssues.length,
  };
}
