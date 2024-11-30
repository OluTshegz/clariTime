import { describe, expect, it, beforeEach } from "vitest";

// Simulate contract interactions
describe("Time-locked Wallet Contract - Emergency Withdrawal", () => {
  
  let contractOwner = "owner-address";
  let userAddress = "user-address";
  interface Contract {
    owner: string; // The owner of the contract
    userWallets: {
      [userAddress: string]: { // A map of user addresses to their wallet details
        balance: number; // User's wallet balance
        unlockHeight: number; // The block height at which the wallet unlocks
      };
    };
    txSender: string; // The current transaction sender's address
    blockHeight: number; // The current block height
    penaltyRate: number; // The penalty rate for withdrawals
  }

  let contract: Contract;
  
  // Set up mock contract environment
  beforeEach(() => {
    contract = {
      owner: contractOwner,
      userWallets: {
        [userAddress]: { balance: 500, unlockHeight: 100 },
      },
      txSender: userAddress,
      blockHeight: 100,
      penaltyRate: 10,
    };
  });

  it("should allow deposit of valid amount", async () => {
    const amount = 100;
    
    // Simulate deposit call
    const depositResponse = deposit(contract.txSender, amount);

    expect(depositResponse).toBeTruthy();
    expect(contract.userWallets[userAddress].balance).toBe(600);  // user balance should increase by 100
  });

  it("should reject deposit of zero or negative amount", async () => {
    const amount = 0;
    
    // Simulate deposit call
    const depositResponse = deposit(contract.txSender, amount);
    
    expect(depositResponse).toEqual("err-invalid-amount");
  });

  it("should allow contract owner to set unlock height", async () => {
    const height = 200;
    contract.txSender = contractOwner;  // change tx sender to owner
    
    const setUnlockHeightResponse = setUnlockHeight(contract.txSender, height);
    
    expect(setUnlockHeightResponse).toBeTruthy();
    expect(contract.userWallets[userAddress].unlockHeight).toBe(height);  // unlock height should be updated
  });

  it("should reject non-owner setting unlock height", async () => {
    const height = 200;
    contract.txSender = userAddress;  // non-owner
    
    const setUnlockHeightResponse = setUnlockHeight(contract.txSender, height);
    
    expect(setUnlockHeightResponse).toEqual("err-owner-only");
  });

  it("should reject unlock height less than current block height", async () => {
    const height = 50;  // set a height that is lower than current block height
    
    const setUnlockHeightResponse = setUnlockHeight(contract.txSender, height);
    
    expect(setUnlockHeightResponse).toEqual("err-invalid-amount");
  });

  it("should allow withdrawal after unlock height is reached", async () => {
    const amount = 100;
    contract.blockHeight = 101;  // simulate block height after unlock height
    
    const withdrawResponse = withdraw(contract.txSender, amount);
    
    expect(withdrawResponse).toBeTruthy();
    expect(contract.userWallets[userAddress].balance).toBe(400);  // user's balance should decrease by 100
  });

  it("should reject withdrawal before unlock height", async () => {
    const amount = 100;
    contract.blockHeight = 99;  // simulate block height before unlock height
    
    const withdrawResponse = withdraw(contract.txSender, amount);
    
    expect(withdrawResponse).toEqual("err-not-unlocked");
  });

  it("should reject withdrawal of zero or negative amount", async () => {
    const amount = 0;
    
    const withdrawResponse = withdraw(contract.txSender, amount);
    
    expect(withdrawResponse).toEqual("err-invalid-amount");
  });

  it("should reject withdrawal of amount greater than balance", async () => {
    const amount = 600;  // user's balance is 500
    
    const withdrawResponse = withdraw(contract.txSender, amount);
    
    expect(withdrawResponse).toEqual("err-invalid-amount");
  });

  it("should allow emergency withdrawal with penalty", async () => {
    const amount = 100;
    
    const penalty = (amount * contract.penaltyRate) / 100;
    const expectedWithdrawal = amount - penalty;

    const emergencyWithdrawResponse = emergencyWithdraw(contract.txSender, amount);
    
    expect(emergencyWithdrawResponse).toBe(expectedWithdrawal);
    expect(contract.userWallets[userAddress].balance).toBe(400);  // user's balance should decrease by 100
    expect(contract.userWallets[contractOwner].balance).toBe(penalty);  // owner's balance should increase by penalty amount
  });

  it("should reject emergency withdrawal of zero or negative amount", async () => {
    const amount = 0;
    
    const emergencyWithdrawResponse = emergencyWithdraw(contract.txSender, amount);
    
    expect(emergencyWithdrawResponse).toEqual("err-invalid-amount");
  });

  it("should reject emergency withdrawal of amount greater than balance", async () => {
    const amount = 600;  // user's balance is 500
    
    const emergencyWithdrawResponse = emergencyWithdraw(contract.txSender, amount);
    
    expect(emergencyWithdrawResponse).toEqual("err-invalid-amount");
  });

  it("should get the correct balance of the user", async () => {
    const balance = getBalance(contract.txSender);
    
    expect(balance).toBe(500);  // user's balance
  });

  it("should get the correct unlock height of the user", async () => {
    const unlockHeight = getUnlockHeight(contract.txSender);
    
    expect(unlockHeight).toBe(100);  // user's unlock height
  });
  
});

// Simulated contract functions
function deposit(txSender, amount) {
  if (amount <= 0) return "err-invalid-amount";
  
  // Simulate the deposit process
  const currentWallet = contract.userWallets[txSender] || { balance: 0, unlockHeight: 0 };
  contract.userWallets[txSender] = {
    balance: currentWallet.balance + amount,
    unlockHeight: currentWallet.unlockHeight
  };
  
  return true;
}

function setUnlockHeight(txSender, height) {
  if (txSender !== contract.owner) return "err-owner-only";
  if (height <= contract.blockHeight) return "err-invalid-amount";
  
  const currentWallet = contract.userWallets[txSender] || { balance: 0, unlockHeight: 0 };
  contract.userWallets[txSender].unlockHeight = height;
  
  return true;
}

function withdraw(txSender, amount) {
  const currentWallet = contract.userWallets[txSender];
  
  if (!currentWallet) return "err-owner-only";
  if (contract.blockHeight < currentWallet.unlockHeight) return "err-not-unlocked";
  if (amount <= 0 || amount > currentWallet.balance) return "err-invalid-amount";
  
  contract.userWallets[txSender].balance -= amount;
  return true;
}

function emergencyWithdraw(txSender, amount) {
  const currentWallet = contract.userWallets[txSender];
  
  if (!currentWallet) return "err-owner-only";
  if (amount <= 0 || amount > currentWallet.balance) return "err-invalid-amount";
  
  const penalty = (amount * contract.penaltyRate) / 100;
  const withdrawalAmount = amount - penalty;
  
  contract.userWallets[txSender].balance -= amount;
  contract.userWallets[contract.owner].balance += penalty;
  
  return withdrawalAmount;
}

function getBalance(txSender) {
  const currentWallet = contract.userWallets[txSender];
  return currentWallet ? currentWallet.balance : 0;
}

function getUnlockHeight(txSender) {
  const currentWallet = contract.userWallets[txSender];
  return currentWallet ? currentWallet.unlockHeight : 0;
}
