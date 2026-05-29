import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/jira/issue/route";

const { fetchJiraIssueContext } = vi.hoisted(() => ({
  fetchJiraIssueContext: vi.fn(),
}));
vi.mock("@/lib/server/jira", () => ({
  fetchJiraIssueContext,
}));

describe("POST /api/jira/issue", () => {
  it("returns 400 when issueKey missing", async () => {
    const request = { json: async () => ({ issueKey: "", config: {} }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "issueKey is required." });
  });

  it("returns 400 when config incomplete", async () => {
    const request = { json: async () => ({ issueKey: "ABC-1", config: { baseUrl: "x" } }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Jira base URL, email, and API token are required.",
    });
  });

  it("returns context on success", async () => {
    fetchJiraIssueContext.mockResolvedValueOnce({ summary: "ok" });
    const cfg = { baseUrl: "u", email: "e", apiToken: "t" };
    const request = { json: async () => ({ issueKey: "ABC-1", config: cfg }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ summary: "ok" });
    expect(fetchJiraIssueContext).toHaveBeenCalledWith("ABC-1", cfg);
  });

  it("returns 500 on errors", async () => {
    fetchJiraIssueContext.mockRejectedValueOnce(new Error("jira down"));
    const cfg = { baseUrl: "u", email: "e", apiToken: "t" };
    const request = { json: async () => ({ issueKey: "ABC-1", config: cfg }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "jira down" });
  });
});
