import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

// Test suite
describe("Time-locked Wallet Contract - Events and Logging", () => {
  let chain: Chain;
  let deployer: Account;
  let walletOwner: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    walletOwner = chain.accounts.get("wallet-owner")!;
  });

  it("should allow a user to deposit funds", () => {
    const depositAmount = 1000000; // 1 STX
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "deposit",
        [`u${depositAmount}`],
        walletOwner.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");

    const balance = chain.callReadOnlyFn(
      "time_locked_wallet",
      "get-balance",
      [walletOwner.address],
      walletOwner.address
    );

    expect(balance.result).toBe(`u${depositAmount}`);
  });

  it("should set the unlock height", () => {
    const unlockHeight = 100;

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "set-unlock-height",
        [`u${unlockHeight}`],
        walletOwner.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");

    const height = chain.callReadOnlyFn(
      "time_locked_wallet",
      "get-unlock-height",
      [walletOwner.address],
      walletOwner.address
    );

    expect(height.result).toBe(`u${unlockHeight}`);
  });

  it("should allow withdrawal after the unlock height", () => {
    const depositAmount = 1000000; // 1 STX
    const withdrawAmount = 500000; // 0.5 STX
    const unlockHeight = chain.blockHeight + 1;

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "deposit",
        [`u${depositAmount}`],
        walletOwner.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "set-unlock-height",
        [`u${unlockHeight}`],
        walletOwner.address
      ),
    ]);

    chain.mineEmptyBlockUntil(unlockHeight);

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "withdraw",
        [`u${withdrawAmount}`],
        walletOwner.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");

    const balance = chain.callReadOnlyFn(
      "time_locked_wallet",
      "get-balance",
      [walletOwner.address],
      walletOwner.address
    );

    expect(balance.result).toBe(`u${depositAmount - withdrawAmount}`);
  });

  it("should emit events for deposit, unlock height setting, and withdrawal", () => {
    const depositAmount = 1000000; // 1 STX
    const unlockHeight = chain.blockHeight + 1;
    const withdrawAmount = 500000; // 0.5 STX

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "deposit",
        [`u${depositAmount}`],
        walletOwner.address
      ),
    ]);

    const depositEvent = chain.getEvents("time_locked_wallet", walletOwner.address).find(event =>
      event.contract_event?.topic === "deposit"
    );

    expect(depositEvent).toBeDefined();
    expect(depositEvent!.contract_event?.payload).toContain(walletOwner.address);

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "set-unlock-height",
        [`u${unlockHeight}`],
        walletOwner.address
      ),
    ]);

    const unlockEvent = chain.getEvents("time_locked_wallet", walletOwner.address).find(event =>
      event.contract_event?.topic === "set-unlock-height"
    );

    expect(unlockEvent).toBeDefined();

    chain.mineEmptyBlockUntil(unlockHeight);

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "withdraw",
        [`u${withdrawAmount}`],
        walletOwner.address
      ),
    ]);

    const withdrawEvent = chain.getEvents("time_locked_wallet", walletOwner.address).find(event =>
      event.contract_event?.topic === "withdraw"
    );

    expect(withdrawEvent).toBeDefined();
  });

  it("should fail to withdraw funds before unlock height", () => {
    const depositAmount = 1000000; // 1 STX
    const withdrawAmount = 500000; // 0.5 STX
    const unlockHeight = chain.blockHeight + 5;

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "deposit",
        [`u${depositAmount}`],
        walletOwner.address
      ),
    ]);

    chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "set-unlock-height",
        [`u${unlockHeight}`],
        walletOwner.address
      ),
    ]);

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "time_locked_wallet",
        "withdraw",
        [`u${withdrawAmount}`],
        walletOwner.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(err u101)"); // Unlock error
  });
});
