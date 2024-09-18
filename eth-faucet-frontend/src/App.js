import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0xFDC15d3e8b0e12b7Ae6442774c8D4a0A35836216';
const RELAYER_URL = 'http://localhost:3000';

const contractABI = [
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_withdrawalAmount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "_relayer",
				"type": "address"
			}
		],
		"stateMutability": "payable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "from",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Deposit",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "nonce",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "functionSignature",
				"type": "bytes"
			},
			{
				"internalType": "bytes32",
				"name": "r",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "s",
				"type": "bytes32"
			},
			{
				"internalType": "uint8",
				"name": "v",
				"type": "uint8"
			}
		],
		"name": "executeMetaTransaction",
		"outputs": [
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_amount",
				"type": "uint256"
			}
		],
		"name": "setWithdrawalAmount",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "userAddress",
				"type": "address"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "to",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "Withdrawal",
		"type": "event"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	},
	{
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "lockTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "nonces",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "relayer",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "withdrawalAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
];

export default function ETHFaucet() {
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [withdrawalAmount, setWithdrawalAmount] = useState('0');
  const [status, setStatus] = useState('');

  useEffect(() => {
    async function fetchContractInfo() {
      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
        
        const amount = await contract.withdrawalAmount();
        setWithdrawalAmount(ethers.formatEther(amount));
        
        const contractBalance = await contract.getBalance();
        setBalance(ethers.formatEther(contractBalance));
      }
    }
    fetchContractInfo();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAddress(address);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const requestWithdrawal = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

        const nonce = await contract.nonces(address);
        const functionSignature = contract.interface.encodeFunctionData('withdraw', [address]);
        
        const messageHash = ethers.solidityPackedKeccak256(
          ['address', 'uint256', 'bytes'],
          [address, nonce, functionSignature]
        );
        const messageHashBinary = ethers.getBytes(messageHash);
        const signature = await signer.signMessage(messageHashBinary);

        const { r, s, v } = ethers.Signature.from(signature);

        const response = await fetch(`${RELAYER_URL}/execute-meta-transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userAddress: address, functionSignature, r, s, v })
        });
        const data = await response.json();

        if (data.success) {
          setStatus(`Withdrawal successful! Transaction hash: ${data.transactionHash}`);
        } else {
          setStatus(`Withdrawal failed: ${data.error}`);
        }
      } catch (error) {
        setStatus(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div>
      <h1>Gasless ETH Faucet</h1>
      <p>Contract Balance: {balance} ETH</p>
      <p>Withdrawal Amount: {withdrawalAmount} ETH</p>
      {!address ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>Connected Address: {address}</p>
          <button onClick={requestWithdrawal}>Request Withdrawal</button>
        </>
      )}
      {status && <p>{status}</p>}
    </div>
  );
}