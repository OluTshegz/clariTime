# Time-locked Wallet Smart Contract

## Overview

This project implements a Time-locked Wallet using a Clarity 3.0 smart contract on the Stacks blockchain. The contract allows users to deposit STX (Stacks' native token) and withdraw them only after a specified block height has been reached.

## Features

- Deposit STX into the contract
- Set a future unlock height (block number)
- Withdraw funds after the unlock height is reached
- Check current balance and unlock height

## Contract Functions

### Public Functions

1. `deposit(amount: uint) -> (response bool)`
   - Allows users to deposit STX into the contract.

2. `set-unlock-height(height: uint) -> (response bool)`
   - Allows the contract owner to set the unlock height.

3. `withdraw(amount: uint) -> (response bool)`
   - Allows the contract owner to withdraw STX after the unlock height is reached.

### Read-Only Functions

1. `get-balance() -> uint`
   - Returns the current STX balance of the contract.

2. `get-unlock-height() -> uint`
   - Returns the current unlock height set in the contract.

## Usage

1. Deploy the contract to the Stacks blockchain.
2. Use the `deposit` function to add STX to the wallet.
3. Set the unlock height using the `set-unlock-height` function (only the contract owner can do this).
4. Once the blockchain reaches the specified block height, use the `withdraw` function to retrieve the funds.

## Security Considerations

- Only the contract owner can set the unlock height and withdraw funds.
- Funds cannot be withdrawn before the unlock height is reached.
- Make sure to set a realistic unlock height to avoid locking funds indefinitely.

## Development and Testing

To interact with this contract, you can use the Clarity console or integrate it with a frontend application using Stacks.js.

For testing:
1. Use the Clarinet testing framework to write and run unit tests.
2. Deploy to a testnet before mainnet to ensure everything works as expected.

## License

[Specify your license here]

## Contributing

[Add guidelines for contributing to your project]


# clariTime


## a clarity-clarinet smart contract project based on the `stacks` (a bitcoin layer 2 economy) that focuses on the beginner's guide to learning blockchain with the clarity language using clarinet runtime built with cargo, the rust package manager.

## This project is about implementing a Time-locked Wallet smart contract. It basically allows users to deposit STX (the native token of Stacks) and withdraw them after a specified time period.

