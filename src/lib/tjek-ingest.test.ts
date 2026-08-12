import { describe, expect, it, vi } from "vite-plus/test";
import { ingestAllChainsFrom } from "./tjek-ingest.ts";

describe("ingestAllChainsFrom", () => {
  it("continues with the remaining chains when one fails", async () => {
    const ingest = vi
      .fn()
      .mockResolvedValueOnce({ inserted: 1, updated: 0 })
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ inserted: 2, updated: 0 });

    const chains = [
      { id: "a", tjek_dealer_id: "1" },
      { id: "b", tjek_dealer_id: "2" },
      { id: "c", tjek_dealer_id: "3" },
    ];

    const results = await ingestAllChainsFrom(chains, ingest);

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ chainId: "a", ok: true, inserted: 1 });
    expect(results[1]).toMatchObject({ chainId: "b", ok: false });
    expect(results[2]).toMatchObject({ chainId: "c", ok: true, inserted: 2 });
    expect(ingest).toHaveBeenCalledTimes(3);
  });
});
