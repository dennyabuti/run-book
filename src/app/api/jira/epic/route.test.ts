import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/jira/epic/route";

const { fetchJiraEpicContext } = vi.hoisted(() => ({
  fetchJiraEpicContext: vi.fn(),
}));
vi.mock("@/lib/server/jira", () => ({
  fetchJiraEpicContext,
}));

describe("POST /api/jira/epic", () => {
  it("returns 400 when epicKey missing", async () => {
    const request = { json: async () => ({ epicKey: "", config: {} }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "epicKey is required." });
  });

  it("returns 400 when config incomplete", async () => {
    const request = { json: async () => ({ epicKey: "EPIC-1", config: { baseUrl: "x" } }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Jira base URL, email, and API token are required.",
    });
  });

  it("returns context on success", async () => {
    fetchJiraEpicContext.mockResolvedValueOnce({ epicKey: "EPIC-1" });
    const cfg = { baseUrl: "u", email: "e", apiToken: "t" };
    const request = { json: async () => ({ epicKey: "EPIC-1", config: cfg }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ epicKey: "EPIC-1" });
    expect(fetchJiraEpicContext).toHaveBeenCalledWith("EPIC-1", cfg);
  });

  it("returns 500 on errors", async () => {
    fetchJiraEpicContext.mockRejectedValueOnce(new Error("jira down"));
    const cfg = { baseUrl: "u", email: "e", apiToken: "t" };
    const request = { json: async () => ({ epicKey: "EPIC-1", config: cfg }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "jira down" });
  });
});
