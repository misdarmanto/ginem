import { describe, expect, it, vi } from "vitest";
import { removeAll } from "./bulkDelete";

describe("removeAll", () => {
  it("removes every id", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);

    await removeAll([1, 2, 3], remove);

    expect(remove).toHaveBeenCalledTimes(3);
  });

  it("still attempts every id and reports how many failed", async () => {
    const remove = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    await expect(removeAll([1, 2, 3], remove)).rejects.toThrow(
      "Failed to delete 1 of 3 items.",
    );
    expect(remove).toHaveBeenCalledTimes(3);
  });
});
