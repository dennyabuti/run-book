import { NextRequest, NextResponse } from "next/server";
import { fetchGitHubPrContext, GitHubFetchConfig } from "@/lib/server/github";

interface GitHubPrPayload {
  prUrl: string;
  config: GitHubFetchConfig;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GitHubPrPayload;
    const prUrl = body.prUrl?.trim();
    const config = body.config ?? {};

    if (!prUrl) {
      return NextResponse.json({ error: "prUrl is required." }, { status: 400 });
    }

    const context = await fetchGitHubPrContext(prUrl, config);
    return NextResponse.json(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch GitHub PR context.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
