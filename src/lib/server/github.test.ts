import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGitHubPrContext } from "@/lib/server/github";

describe("fetchGitHubPrContext", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws for invalid PR URL", async () => {
    await expect(fetchGitHubPrContext("not-a-pr-url", {})).rejects.toThrow(
      "Invalid GitHub PR URL",
    );
  });

  it("throws auth error for 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    await expect(fetchGitHubPrContext("https://github.com/o/r/pull/1", {})).rejects.toThrow(
      "GitHub authentication failed. Check your token.",
    );
  });

  it("throws not found guidance for 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    await expect(fetchGitHubPrContext("https://github.com/o/r/pull/1", {})).rejects.toThrow(
      "GitHub PR not found.",
    );
  });

  it("returns parsed PR context with files and commit summaries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ title: "Improve checkout", body: "Body" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { filename: "src/a.ts", status: "modified" },
          { filename: "src/b.ts", status: "added" },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [
          { commit: { message: "feat: one\n\nmore" } },
          { commit: { message: "fix: two" } },
        ],
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGitHubPrContext("https://github.com/acme/shop/pull/23", {
      token: "abc",
    });

    expect(result).toEqual({
      prUrl: "https://github.com/acme/shop/pull/23",
      title: "Improve checkout",
      body: "Body",
      changedFiles: ["modified: src/a.ts", "added: src/b.ts"],
      commitMessages: ["feat: one", "fix: two"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall[0]).toContain("/repos/acme/shop/pulls/23");
  });
});
