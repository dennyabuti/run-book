import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/github/pr/route";

const { fetchGitHubPrContext } = vi.hoisted(() => ({
  fetchGitHubPrContext: vi.fn(),
}));
vi.mock("@/lib/server/github", () => ({
  fetchGitHubPrContext,
}));

describe("POST /api/github/pr", () => {
  it("returns 400 when prUrl missing", async () => {
    const request = { json: async () => ({ prUrl: "  ", config: {} }) } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "prUrl is required." });
  });

  it("returns context on success", async () => {
    fetchGitHubPrContext.mockResolvedValueOnce({ title: "ok" });
    const request = {
      json: async () => ({ prUrl: "https://github.com/o/r/pull/1", config: { token: "x" } }),
    } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ title: "ok" });
    expect(fetchGitHubPrContext).toHaveBeenCalledWith("https://github.com/o/r/pull/1", { token: "x" });
  });

  it("returns 500 on thrown errors", async () => {
    fetchGitHubPrContext.mockRejectedValueOnce(new Error("boom"));
    const request = {
      json: async () => ({ prUrl: "https://github.com/o/r/pull/1", config: {} }),
    } as Request;

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "boom" });
  });
});
