import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

describe("Transaction History Tracking Contract", () => {
  let chain: Chain;
  let deployer: Account;
  let user: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    user = chain.accounts.get("wallet-owner")!;
  });

  it("should record a transaction", () => {
    const txType = "deposit";
    const amount = 1000000; // 1 STX
    const timestamp = chain.blockHeight;

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "transaction_history",
        "record-transaction",
        [
          user.address,
          `"${txType}"`,
          `u${amount}`,
          `u${timestamp}`,
        ],
        deployer.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");

    const txCount = chain.callReadOnlyFn(
      "transaction_history",
      "get-transaction-count",
      [user.address],
      user.address
    );
    expect(txCount.result).toBe("u1");

    const transaction = chain.callReadOnlyFn(
      "transaction_history",
      "get-transaction",
      [user.address, "u0"],
      user.address
    );

    expect(transaction.result).toContain(txType);
    expect(transaction.result).toContain(`u${amount}`);
    expect(transaction.result).toContain(`u${timestamp}`);
  });

  it("should return the total transaction count for a user", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "transaction_history",
        "record-transaction",
        [user.address, `"deposit"`, "u1000000", `u${chain.blockHeight}`],
        deployer.address
      ),
      Tx.contractCall(
        "transaction_history",
        "record-transaction",
        [user.address, `"withdrawal"`, "u500000", `u${chain.blockHeight}`],
        deployer.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");
    expect(receipt.receipts[1].result).toBe("(ok true)");

    const txCount = chain.callReadOnlyFn(
      "transaction_history",
      "get-transaction-count",
      [user.address],
      user.address
    );

    expect(txCount.result).toBe("u2");
  });

  it("should prevent unauthorized transaction recording", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "transaction_history",
        "record-transaction",
        [user.address, `"deposit"`, "u1000000", `u${chain.blockHeight}`],
        user.address // Unauthorized user
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(err u401)");
  });
});
