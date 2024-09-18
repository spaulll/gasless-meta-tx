// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GaslessETHFaucet {
    address public owner;
    address public relayer;
    uint256 public withdrawalAmount;
    uint256 public lockTime = 1 days;
    mapping(address => uint256) lastWithdrawTime;
    mapping(address => uint256) public nonces;

    event Withdrawal(address indexed to, uint256 amount);
    event Deposit(address indexed from, uint256 amount);

    constructor(uint256 _withdrawalAmount, address _relayer) payable {
        owner = msg.sender;
        relayer = _relayer;
        withdrawalAmount = _withdrawalAmount;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function executeMetaTransaction(
        address userAddress,
        uint256 nonce,
        bytes memory functionSignature,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) public returns (bytes memory) {
        require(msg.sender == relayer, "Only relayer can execute meta-transactions");
        require(nonce == nonces[userAddress], "Invalid nonce");

        bytes32 messageHash = keccak256(abi.encodePacked(userAddress, nonce, functionSignature));
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        address signer = ecrecover(ethSignedMessageHash, v, r, s);
        require(signer == userAddress, "Invalid signature");

        nonces[userAddress]++;

        (bool success, bytes memory returnData) = address(this).call(abi.encodePacked(functionSignature, userAddress));
        require(success, "Function call failed");

        return returnData;
    }

    function withdraw(address userAddress) public {
        require(msg.sender == address(this), "Only callable through executeMetaTransaction");
        require(block.timestamp >= lastWithdrawTime[userAddress] + lockTime, "You need to wait 1 day between withdrawals");
        require(address(this).balance >= withdrawalAmount, "Not enough funds in the faucet");

        lastWithdrawTime[userAddress] = block.timestamp;
        payable(userAddress).transfer(withdrawalAmount);

        emit Withdrawal(userAddress, withdrawalAmount);
    }

    function setWithdrawalAmount(uint256 _amount) public {
        require(msg.sender == owner, "Only the owner can change the withdrawal amount");
        withdrawalAmount = _amount;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}