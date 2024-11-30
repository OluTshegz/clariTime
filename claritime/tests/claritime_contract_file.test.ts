import { describe, expect, it, beforeEach } from "vitest";

// Simulate contract interactions
describe("Time-locked Wallet Contract", () => {
  
  let contractOwner = "owner-address";
  let userAddress = "user-address";
  interface Contract {
    owner: string;
    unlockHeight: number;
    balances: { [key: string]: number };
    txSender: string;
    blockHeight: number;
  }

  let contract: Contract;
  
  // Set up mock contract environment
  beforeEach(() => {
    contract = {
      owner: contractOwner,
      unlockHeight: 0,
      balances: {
        [contractOwner]: 1000,
        [userAddress]: 500
      },
      txSender: userAddress,
      blockHeight: 100
    };
  });

  it("should allow deposit of valid amount", async () => {
    const amount = 100;
    
    // Simulate deposit call
    const depositResponse = deposit(contract.txSender, amount);

    expect(depositResponse).toBeTruthy();
    expect(contract.balances[userAddress]).toBe(600);  // user balance should increase by 100
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
    expect(contract.unlockHeight).toBe(height);  // unlock height should be updated
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
    const height = 200;
    contract.txSender = contractOwner;  // owner sets the unlock height
    setUnlockHeight(contract.txSender, height);
    
    contract.blockHeight = 201;  // simulate block height after unlock height
    
    const withdrawResponse = withdraw(contract.txSender, amount);
    
    expect(withdrawResponse).toBeTruthy();
    expect(contract.balances[contractOwner]).toBe(900);  // owner's balance should decrease
  });

  it("should reject withdrawal before unlock height", async () => {
    const amount = 100;
    const height = 200;
    contract.txSender = contractOwner;  // owner sets the unlock height
    setUnlockHeight(contract.txSender, height);
    
    contract.blockHeight = 100;  // simulate block height before unlock height
    
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

  it("should get the correct balance of the contract", async () => {
    const balance = getBalance(contract.txSender);
    
    expect(balance).toBe(500);  // user's balance
  });

  it("should get the correct unlock height", async () => {
    const height = 200;
    setUnlockHeight(contract.txSender, height);
    
    const unlockHeight = getUnlockHeight();
    
    expect(unlockHeight).toBe(height);
  });
  
});

// Simulated contract functions
function deposit(txSender, amount) {
  if (amount <= 0) return "err-invalid-amount";
  
  // Simulate the deposit process
  contract.balances[txSender] += amount;
  
  return true;
}

function setUnlockHeight(txSender, height) {
  if (txSender !== contract.owner) return "err-owner-only";
  if (height <= contract.blockHeight) return "err-invalid-amount";
  
  contract.unlockHeight = height;
  return true;
}

function withdraw(txSender, amount) {
  if (contract.blockHeight < contract.unlockHeight) return "err-not-unlocked";
  if (amount <= 0 || amount > contract.balances[txSender]) return "err-invalid-amount";
  
  contract.balances[txSender] -= amount;
  contract.balances[contract.owner] += amount;
  
  return true;
}

function getBalance(txSender) {
  return contract.balances[txSender];
}

function getUnlockHeight() {
  return contract.unlockHeight;
}
