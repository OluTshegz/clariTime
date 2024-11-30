import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

describe("Transaction Summary Contract", () => {
  let chain: Chain;
  let deployer: Account;
  let user: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    user = chain.accounts.get("wallet-owner")!;

    // Record transactions for summary tests
    chain.mineBlock([
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
  });

  it("should retrieve all transactions for a user", () => {
    const transactions = chain.callReadOnlyFn(
      "transaction_summary",
      "get-all-transactions",
      [user.address],
      user.address
    );

    expect(transactions.result).toContain('"deposit"');
    expect(transactions.result).toContain('"withdrawal"');
  });

  it("should retrieve transactions filtered by type", () => {
    const filteredTransactions = chain.callReadOnlyFn(
      "transaction_summary",
      "get-summary-by-type",
      [user.address, `"deposit"`],
      user.address
    );

    expect(filteredTransactions.result).toContain('"deposit"');
    expect(filteredTransactions.result).not.toContain('"withdrawal"');
  });

  it("should return an error for an invalid transaction type", () => {
    const invalidType = chain.callReadOnlyFn(
      "transaction_summary",
      "get-summary-by-type",
      [user.address, `"invalid-type"`],
      user.address
    );

    expect(invalidType.result).toBe("(err u400)");
  });

  it("should return an error if no transactions exist", () => {
    const noTransactions = chain.callReadOnlyFn(
      "transaction_summary",
      "get-summary-by-type",
      [deployer.address, `"deposit"`],
      deployer.address
    );

    expect(noTransactions.result).toBe("(err u404)");
  });
});
