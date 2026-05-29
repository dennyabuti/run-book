import { NextRequest, NextResponse } from "next/server";
import { fetchJiraEpicContext, JiraFetchConfig } from "@/lib/server/jira";

interface JiraEpicPayload {
  epicKey: string;
  config: JiraFetchConfig;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JiraEpicPayload;
    const epicKey = body.epicKey?.trim();
    const config = body.config;

    if (!epicKey) {
      return NextResponse.json({ error: "epicKey is required." }, { status: 400 });
    }

    if (!config?.baseUrl || !config?.email || !config?.apiToken) {
      return NextResponse.json({ error: "Jira base URL, email, and API token are required." }, { status: 400 });
    }

    const context = await fetchJiraEpicContext(epicKey, config);
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Jira epic context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
