import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet-sdk";

describe("Time-locked Wallet Contract - Multiple User Support", () => {
  let chain: Chain;
  let accounts: Map<string, Account>;

  beforeEach(async () => {
    const setup = Clarinet.setup();
    chain = setup.chain;
    accounts = setup.accounts;
  });

  it("should increase user balance after deposit", async () => {
    const user = accounts.get("wallet_1")!;
    const tx = Tx.contractCall(
      "time-locked-wallet",
      "deposit",
      [100],
      user.address
    );
    const block = chain.mineBlock([tx]);
    expect(block.receipts[0].result).toEqual({ ok: true, value: true });

    const balance = chain.callReadOnlyFn(
      "time-locked-wallet",
      "get-balance",
      [user.address],
      user.address
    );
    expect(balance.result).toEqual({ ok: true, value: 100 });
  });

  it("should decrease user balance after withdrawal", async () => {
    const user = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall("time-locked-wallet", "deposit", [200], user.address),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "time-locked-wallet",
        "set-unlock-height",
        [chain.blockHeight + 1],
        user.address
      ),
    ]);

    chain.mineEmptyBlock(1);

    const withdrawTx = Tx.contractCall(
      "time-locked-wallet",
      "withdraw",
      [100],
      user.address
    );
    const block = chain.mineBlock([withdrawTx]);
    expect(block.receipts[0].result).toEqual({ ok: true, value: true });

    const balance = chain.callReadOnlyFn(
      "time-locked-wallet",
      "get-balance",
      [user.address],
      user.address
    );
    expect(balance.result).toEqual({ ok: true, value: 100 });
  });

  it("should not allow withdrawal before unlock height", async () => {
    const user = accounts.get("wallet_1")!;
    chain.mineBlock([
      Tx.contractCall("time-locked-wallet", "deposit", [200], user.address),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "time-locked-wallet",
        "set-unlock-height",
        [chain.blockHeight + 10],
        user.address
      ),
    ]);

    const withdrawTx = Tx.contractCall(
      "time-locked-wallet",
      "withdraw",
      [100],
      user.address
    );
    const block = chain.mineBlock([withdrawTx]);
    expect(block.receipts[0].result).toEqual({ ok: false, value: 101 }); // err-not-unlocked
  });
});
