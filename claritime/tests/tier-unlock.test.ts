import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet-sdk";

describe("Time-locked Wallet Contract - Tiered Unlock System", () => {
  let chain: Chain;
  let accounts: Map<string, Account>;

  beforeEach(async () => {
    const setup = Clarinet.setup();
    chain = setup.chain;
    accounts = setup.accounts;
  });

  it("should add balance to user account after deposit", async () => {
    const user = accounts.get("wallet_1")!;
    const tx = Tx.contractCall(
      "time-locked-wallet-tiered",
      "deposit",
      [100],
      user.address
    );
    const block = chain.mineBlock([tx]);
    expect(block.receipts[0].result).toEqual({ ok: true, value: true });

    const balance = chain.callReadOnlyFn(
      "time-locked-wallet-tiered",
      "get-balance",
      [user.address],
      user.address
    );
    expect(balance.result).toEqual({ ok: true, value: 100 });
  });

  it("should set unlock conditions for funds with a tier", async () => {
    const user = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall(
        "time-locked-wallet-tiered",
        "deposit",
        [300],
        user.address
      ),
    ]);

    const addTierTx = Tx.contractCall(
      "time-locked-wallet-tiered",
      "add-tier",
      [100, chain.blockHeight + 5],
      user.address
    );
    const block = chain.mineBlock([addTierTx]);
    expect(block.receipts[0].result).toEqual({ ok: true, value: true });

    const tiers = chain.callReadOnlyFn(
      "time-locked-wallet-tiered",
      "get-tiers",
      [user.address],
      user.address
    );
    expect(tiers.result).toBeInstanceOf(Array);
  });

  it("should release unlocked funds while retaining locked funds", async () => {
    const user = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall(
        "time-locked-wallet-tiered",
        "deposit",
        [300],
        user.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "time-locked-wallet-tiered",
        "add-tier",
        [100, chain.blockHeight + 1],
        user.address
      ),
    ]);

    chain.mineEmptyBlock(2);

    const withdrawTx = Tx.contractCall(
      "time-locked-wallet-tiered",
      "withdraw",
      [],
      user.address
    );
    const block = chain.mineBlock([withdrawTx]);
    expect(block.receipts[0].result).toEqual({ ok: true, value: true });

    const balance = chain.callReadOnlyFn(
      "time-locked-wallet-tiered",
      "get-balance",
      [user.address],
      user.address
    );
    expect(balance.result).toEqual({ ok: true, value: 200 });
  });
});
