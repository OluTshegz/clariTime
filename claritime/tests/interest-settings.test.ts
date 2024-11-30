import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

describe("Interest Rate Settings Module", () => {
  let chain: Chain;
  let deployer: Account;
  let user: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    user = chain.accounts.get("wallet-owner")!;
  });

  it("should set a valid interest rate for a user", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "interest_rate_settings",
        "set-interest-rate",
        ["u10"], // Valid interest rate
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");

    const userRate = chain.callReadOnlyFn(
      "interest_rate_settings",
      "get-interest-rate",
      [user.address],
      user.address
    );

    expect(userRate.result).toBe("u10");
  });

  it("should return an error when setting an invalid interest rate", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "interest_rate_settings",
        "set-interest-rate",
        ["u0"], // Invalid interest rate
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(err u100)");
  });

  it("should return the default interest rate if no rate is set", () => {
    const defaultRate = chain.callReadOnlyFn(
      "interest_rate_settings",
      "get-interest-rate",
      [user.address],
      user.address
    );

    expect(defaultRate.result).toBe("u5"); // Default interest rate is 5%
  });
});
