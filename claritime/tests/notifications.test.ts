import { describe, expect, it, beforeEach } from "vitest";
import { Clarinet, Tx, Chain, Account } from "clarinet";

describe("Notifications and Reminders Module", () => {
  let chain: Chain;
  let deployer: Account;
  let user: Account;

  beforeEach(() => {
    chain = new Chain();
    deployer = chain.accounts.get("deployer")!;
    user = chain.accounts.get("wallet-owner")!;
  });

  it("should allow a user to set a reminder with a valid time", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "notifications",
        "set-reminder",
        [`"Deposit Funds"`, "u20"], // Reminder message and time
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toContain("(ok");
  });

  it("should prevent setting a reminder for a past or current block", () => {
    const receipt = chain.mineBlock([
      Tx.contractCall(
        "notifications",
        "set-reminder",
        [`"Past Reminder"`, "u0"], // Invalid time
        user.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(err u100)");
  });

  it("should retrieve upcoming reminders for a user", () => {
    chain.mineBlock([
      Tx.contractCall("notifications", "set-reminder", [`"Reminder 1"`, "u20"], user.address),
      Tx.contractCall("notifications", "set-reminder", [`"Reminder 2"`, "u25"], user.address),
    ]);

    const reminders = chain.callReadOnlyFn(
      "notifications",
      "get-upcoming-reminders",
      [user.address],
      user.address
    );

    expect(reminders.result).toContain("Reminder 1");
    expect(reminders.result).toContain("Reminder 2");
  });

  it("should mark a reminder as notified", () => {
    chain.mineBlock([
      Tx.contractCall("notifications", "set-reminder", [`"Notify Reminder"`, "u20"], user.address),
    ]);

    const receipt = chain.mineBlock([
      Tx.contractCall("notifications", "mark-as-notified", [user.address, "u1"], user.address),
    ]);

    expect(receipt.receipts[0].result).toBe("(ok true)");
  });

  it("should prevent unauthorized marking of reminders", () => {
    chain.mineBlock([
      Tx.contractCall("notifications", "set-reminder", [`"Unauthorized Reminder"`, "u20"], user.address),
    ]);

    const receipt = chain.mineBlock([
      Tx.contractCall(
        "notifications",
        "mark-as-notified",
        [user.address, "u1"], // Trying to mark as another user
        deployer.address
      ),
    ]);

    expect(receipt.receipts[0].result).toBe("(err u101)");
  });
});
