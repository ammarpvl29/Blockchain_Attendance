// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Migrations {
    address public owner;
    uint256 public last_completed_migration;

    // Add modifier first
    modifier restricted() {
        require(msg.sender == owner, "This function is restricted to the contract's owner");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
        last_completed_migration = 0;
    }

    // Set completed migration
    function setCompleted(uint256 completed) public restricted {
        last_completed_migration = completed;
    }

    // Upgrade function
    function upgrade(address new_address) public restricted {
        Migrations upgraded = Migrations(new_address);
        upgraded.setCompleted(last_completed_migration);
    }
}