import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

describe("Interest Calculation Module", () => {
  let chain: Chain;
  let deployer: Account;
  let user: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    user = chain.accounts.get("wallet-owner")!;

    // Set up user lock data
    chain.mineBlock([
      Tx.contractCall(
        "interest_calculation",
        "set-user-lock-data",
        [
          user.address,
          "{ balance: u1000000, unlock-height: u50, deposit-height: u10 }", // Mock lock data
        ],
        deployer.address
      ),
    ]);

    // Set up user-specific interest rate
    chain.mineBlock([
      Tx.contractCall(
        "interest_rate_settings",
        "set-interest-rate",
        ["u5"], // 5% interest rate
        user.address
      ),
    ]);
  });

  it("should calculate accrued interest for a user", () => {
    const accruedInterest = chain.callReadOnlyFn(
      "interest_calculation",
      "calculate-accrued-interest",
      [user.address],
      user.address
    );

    // Calculation: (1000000 * 5 * 40) / 36500 = ~5479
    expect(accruedInterest.result).toBe("(ok u5479)");
  });

  it("should estimate interest without transferring funds", () => {
    const estimatedInterest = chain.callReadOnlyFn(
      "interest_calculation",
      "estimate-interest",
      [user.address],
      user.address
    );

    // Same calculation as above
    expect(estimatedInterest.result).toBe("u5479");
  });

  it("should return an error if no lock data is available for a user", () => {
    const noDataInterest = chain.callReadOnlyFn(
      "interest_calculation",
      "calculate-accrued-interest",
      [deployer.address], // Deployer has no lock data
      deployer.address
    );

    expect(noDataInterest.result).toBe("(err u404)");
  });

  it("should return zero estimated interest for users without lock data", () => {
    const noDataEstimate = chain.callReadOnlyFn(
      "interest_calculation",
      "estimate-interest",
      [deployer.address], // Deployer has no lock data
      deployer.address
    );

    expect(noDataEstimate.result).toBe("u0");
  });
});
