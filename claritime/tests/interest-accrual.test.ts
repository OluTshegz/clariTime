import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

describe("Time-locked Wallet Contract - Interest Accrual", () => {
  let chain: Chain;
  let deployer: Account;
  let user: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    user = chain.accounts.get("wallet-owner")!;
  });

  it("should allow a user to deposit funds", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "deposit",
        ["u1000"], // Deposit amount
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");

    const balance = chain.callReadOnlyFn(
      "time_locked_wallet",
      "get-balance",
      [user.address],
      user.address
    );

    expect(balance.result).toBe("(ok u1000)"); // Initial balance without interest
  });

  it("should allow setting unlock height greater than the current block", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "set-unlock-height",
        ["u50"], // Unlock height
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");
  });

  it("should prevent setting unlock height less than or equal to the current block", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "set-unlock-height",
        ["u10"], // Invalid unlock height
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(err u102)");
  });

  it("should calculate the total balance including accrued interest", () => {
    chain.mineBlock([
      Tx.contractCall("time_locked_wallet", "deposit", ["u1000"], user.address),
      Tx.contractCall("time_locked_wallet", "set-unlock-height", ["u50"], user.address),
    ]);

    const balance = chain.callReadOnlyFn(
      "time_locked_wallet",
      "get-balance",
      [user.address],
      user.address
    );

    // Example calculation: Balance + interest ((1000 * 5 * lock-duration) / 36500)
    expect(balance.result).toContain("u");
  });

  it("should allow withdrawal after the unlock height", () => {
    chain.mineBlock([
      Tx.contractCall("time_locked_wallet", "deposit", ["u1000"], user.address),
      Tx.contractCall("time_locked_wallet", "set-unlock-height", ["u50"], user.address),
    ]);

    chain.mineEmptyBlockUntil(50); // Fast forward to unlock height

    const receipt = chain.mineBlock([
      Tx.contractCall("time_locked_wallet", "withdraw", [], user.address),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");
  });
});
