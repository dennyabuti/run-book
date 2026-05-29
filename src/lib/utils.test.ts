import { describe, expect, it, vi } from "vitest";
import { percent, uid } from "@/lib/utils";

describe("uid", () => {
  it("builds id from prefix timestamp and token", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.123456789);
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const value = uid("plan");

    expect(value).toBe("plan_1700000000000_4fzzzxjy");
    randomSpy.mockRestore();
    nowSpy.mockRestore();
  });
});

describe("percent", () => {
  it("returns 0 when max is 0", () => {
    expect(percent(5, 0)).toBe(0);
  });

  it("returns rounded percentage for normal values", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(3, 3)).toBe(100);
  });

  it("supports negative values when provided", () => {
    expect(percent(-1, 4)).toBe(-25);
  });
});
