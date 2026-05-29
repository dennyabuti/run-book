import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchJiraEpicContext, fetchJiraIssueContext } from "@/lib/server/jira";

const config = {
  baseUrl: "https://example.atlassian.net",
  email: "qa@example.com",
  apiToken: "token",
};

function issuePayload(key: string, summary: string, description = "desc", ac = "ac") {
  return {
    key,
    fields: {
      summary,
      description,
      customfield_10000: ac,
    },
  };
}

describe("jira server helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchJiraIssueContext returns mapped issue summary fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => issuePayload("PROJ-1", "Fix login", "desc", "criteria"),
      }),
    );

    const result = await fetchJiraIssueContext("PROJ-1", config);

    expect(result).toEqual({
      summary: "Fix login",
      description: "desc",
      acceptanceCriteria: "criteria",
      linkedTicketKeys: ["PROJ-1"],
    });
  });

  it("fetchJiraIssueContext throws for failed issue lookup", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchJiraIssueContext("PROJ-1", config)).rejects.toThrow(
      "Jira request failed with status 500.",
    );
  });

  it("fetchJiraEpicContext aggregates unique child issues across strategies", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issuePayload("EPIC-1", "Epic title", "epic desc", "epic ac"),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ issues: [issuePayload("PROJ-2", "Child A", "d1", "ac1")], total: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ issues: [issuePayload("PROJ-2", "Child A", "d1", "ac1")], total: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ issues: [issuePayload("PROJ-3", "Child B", "d2", "ac2")], total: 1 }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchJiraEpicContext("EPIC-1", config);

    expect(result.epicKey).toBe("EPIC-1");
    expect(result.childIssueCount).toBe(2);
    expect(result.linkedTicketKeys).toEqual(["PROJ-2", "PROJ-3"]);
    expect(result.description).toContain("Epic Tickets:");
    expect(result.acceptanceCriteria).toContain("Ticket Acceptance Criteria:");
  });

  it("fetchJiraEpicContext handles 400 search responses as empty children", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => issuePayload("EPIC-1", "Epic title", "epic desc", "epic ac"),
      })
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: false, status: 400 });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchJiraEpicContext("EPIC-1", config);

    expect(result.childIssueCount).toBe(0);
    expect(result.linkedTicketKeys).toEqual([]);
  });
});
