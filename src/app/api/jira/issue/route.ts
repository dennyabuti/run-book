import { NextRequest, NextResponse } from "next/server";
import { fetchJiraIssueContext, JiraFetchConfig } from "@/lib/server/jira";

interface JiraIssuePayload {
  issueKey: string;
  config: JiraFetchConfig;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JiraIssuePayload;
    const issueKey = body.issueKey?.trim();
    const config = body.config;

    if (!issueKey) {
      return NextResponse.json({ error: "issueKey is required." }, { status: 400 });
    }

    if (!config?.baseUrl || !config?.email || !config?.apiToken) {
      return NextResponse.json({ error: "Jira base URL, email, and API token are required." }, { status: 400 });
    }

    const context = await fetchJiraIssueContext(issueKey, config);
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Jira issue context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
