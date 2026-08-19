import { JsonRpcProvider, Wallet, Contract, Interface, formatEther, parseEther } from 'ethers';

const ROBINHOOD_RPC = 'https://rpc.mainnet.chain.robinhood.com';
const ROBINHOOD_CHAIN_ID = 4663;

const STANDARD_MINT_ABI = [
  'function publicMint(uint256 quantity) payable',
  'function publicMint() payable',
  'function mint(uint256 quantity) payable',
  'function mint() payable',
  'function mintNFT(uint256 quantity) payable',
  'function mintNFT() payable',
  'function claim(uint256 quantity) payable',
  'function claim() payable',
  'function purchase(uint256 quantity) payable',
  'function isPublicMintActive() view returns (bool)',
  'function isSaleActive() view returns (bool)',
  'function saleIsActive() view returns (bool)',
  'function mintPrice() view returns (uint256)',
  'function cost() view returns (uint256)',
  'function price() view returns (uint256)'
];

const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

export type MintResult = {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  selectedFunction?: string;
  error?: string;
};

type BroadcastHandler = (txHash: string, functionSignature: string) => Promise<void> | void;

export type TransferResult = {
  success: boolean;
  txHash?: string;
  error?: string;
};

export class ChainExecutor {
  private readonly provider: JsonRpcProvider;
  private readonly rpcUrl: string;
  private readonly balanceCache = new Map<string, { bal: string; expires: number }>();

  constructor(rpcUrl: string = ROBINHOOD_RPC) {
    this.rpcUrl = rpcUrl;
    this.provider = new JsonRpcProvider(rpcUrl, ROBINHOOD_CHAIN_ID, { staticNetwork: true });
  }

  /**
   * Fetches real-time ETH balance directly from Robinhood Chain with multi-fallback RPC and resilient retry.
   */
  async getBalance(address: string): Promise<string> {
    const key = address.toLowerCase();
    const cached = this.balanceCache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.bal;
    }

    // 1. Direct raw JSON-RPC fetch
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        }),
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json() as { result?: string };
        if (data.result) {
          const balWei = BigInt(data.result);
          const bal = formatEther(balWei);
          this.balanceCache.set(key, { bal, expires: Date.now() + 30000 });
          return bal;
        }
      }
    } catch {}

    // 2. Fallback to ethers provider
    try {
      const balWei = await this.provider.getBalance(address);
      const bal = formatEther(balWei);
      this.balanceCache.set(key, { bal, expires: Date.now() + 30000 });
      return bal;
    } catch {}

    // 3. Return last cached balance or 0.0000
    return cached?.bal || '0.0000';
  }

  /**
   * Checks if an address owns a specific NFT tokenId on Robinhood Chain.
   */
  async verifyOwnership(nftContract: string, tokenId: string, userAddress: string): Promise<{ owns: boolean; actualOwner?: string }> {
    try {
      const contract = new Contract(nftContract, ERC721_ABI, this.provider);
      const owner = await contract.ownerOf(BigInt(tokenId));
      return {
        owns: owner.toLowerCase() === userAddress.toLowerCase(),
        actualOwner: owner
      };
    } catch {
      return { owns: false };
    }
  }

  /**
   * Executes a direct NFT public mint on Robinhood Chain from user's private key.
   * Encodes explicit function calldata and pre-simulates before broadcasting.
   */
  async executeMint(
    privateKey: string,
    targetContract: string,
    quantity: number = 1,
    valueEth: string = '0',
    onBroadcast?: BroadcastHandler
  ): Promise<MintResult> {
    try {
      const wallet = new Wallet(privateKey, this.provider);
      const balance = await this.provider.getBalance(wallet.address);
      const valueWei = parseEther(valueEth || '0');

      if (balance < valueWei) {
        return {
          success: false,
          error: `Insufficient ETH in sniper wallet (${formatEther(balance)} ETH available, but mint requires ${valueEth} ETH + gas).`
        };
      }

      const fnCandidates = [
        { sig: 'mint(uint256)', fn: 'mint', args: [BigInt(quantity)] },
        { sig: 'publicMint(uint256)', fn: 'publicMint', args: [BigInt(quantity)] },
        { sig: 'mint()', fn: 'mint', args: [] },
        { sig: 'publicMint()', fn: 'publicMint', args: [] },
        { sig: 'claim(uint256)', fn: 'claim', args: [BigInt(quantity)] },
        { sig: 'claim()', fn: 'claim', args: [] },
        { sig: 'mintNFT(uint256)', fn: 'mintNFT', args: [BigInt(quantity)] },
        { sig: 'mintNFT()', fn: 'mintNFT', args: [] },
        { sig: 'purchase(uint256)', fn: 'purchase', args: [BigInt(quantity)] },
        { sig: 'purchase()', fn: 'purchase', args: [] },
        { sig: 'buy(uint256)', fn: 'buy', args: [BigInt(quantity)] },
        { sig: 'buy()', fn: 'buy', args: [] }
      ];

      let txHash: string | undefined;
      let blockNumber = 0;
      let gasUsed = '21000';
      let selectedFunction: string | undefined;
      let lastError: Error | null = null;

      for (const candidate of fnCandidates) {
        try {
          const iface = new Interface([`function ${candidate.sig} payable`]);
          const calldata = iface.encodeFunctionData(candidate.fn, candidate.args);

          let gasLimit = 380000n;
          try {
            const est = await this.provider.estimateGas({
              from: wallet.address,
              to: targetContract,
              data: calldata,
              value: valueWei
            });
            gasLimit = (est * 125n) / 100n; // 25% gas buffer
          } catch (simErr: unknown) {
            lastError = simErr instanceof Error ? simErr : new Error(String(simErr));
            continue;
          }

          const tx = await wallet.sendTransaction({
            to: targetContract,
            data: calldata,
            value: valueWei,
            gasLimit
          });

          if (tx && tx.hash) {
            txHash = tx.hash;
            selectedFunction = candidate.sig;
            try {
              await onBroadcast?.(tx.hash, candidate.sig);
            } catch (notifyErr) {
              console.warn('Broadcast notification failed:', notifyErr);
            }
            try {
              const receipt = await tx.wait();
              if (!receipt || receipt.status !== 1) {
                return { success: false, txHash, selectedFunction: candidate.sig, error: 'Transaction was mined but reverted on-chain.' };
              }
              blockNumber = receipt.blockNumber ?? 0;
              gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : '21000';
              break;
            } catch (waitErr: unknown) {
              const message = waitErr instanceof Error ? waitErr.message : String(waitErr);
              return { success: false, txHash, selectedFunction: candidate.sig, error: `Transaction broadcast but receipt is unresolved: ${message}` };
            }
          }
        } catch (callErr: unknown) {
          const err = callErr instanceof Error ? callErr : new Error(String(callErr));
          lastError = err;
        }
      }

      if (!txHash) {
        if (lastError) {
          const readable = lastError.message.includes('execution reverted')
            ? `Execution reverted: ${lastError.message.split('execution reverted:')[1]?.split('(')[0]?.trim() || lastError.message}`
            : lastError.message;
          return { success: false, error: readable };
        }
        return { success: false, error: 'Could not find matching public mint function on this contract.' };
      }

      return {
        success: true,
        txHash,
        blockNumber,
        gasUsed,
        selectedFunction
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  async executeSeaDropMint(
    privateKey: string,
    seaDropAddress: string,
    nftContract: string,
    quantity: number = 1,
    valueEth: string = '0',
    onBroadcast?: BroadcastHandler
  ): Promise<MintResult> {
    try {
      const wallet = new Wallet(privateKey, this.provider);
      const valueWei = parseEther(valueEth || '0');
      const iface = new Interface(['function mintPublic(address nftContract, uint256 quantity) payable']);
      const data = iface.encodeFunctionData('mintPublic', [nftContract, BigInt(quantity)]);
      const gasEstimate = await this.provider.estimateGas({ from: wallet.address, to: seaDropAddress, data, value: valueWei });
      const gasLimit = (gasEstimate * 125n) / 100n;
      const tx = await wallet.sendTransaction({ to: seaDropAddress, data, value: valueWei, gasLimit });
      await onBroadcast?.(tx.hash, 'mintPublic(address,uint256)');
      try {
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) {
          return { success: false, txHash: tx.hash, selectedFunction: 'mintPublic(address,uint256)', error: 'Transaction was mined but reverted on-chain.' };
        }
        return {
          success: true,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber ?? 0,
          gasUsed: receipt.gasUsed?.toString() ?? '21000',
          selectedFunction: 'mintPublic(address,uint256)'
        };
      } catch (waitErr: unknown) {
        const message = waitErr instanceof Error ? waitErr.message : String(waitErr);
        return { success: false, txHash: tx.hash, selectedFunction: 'mintPublic(address,uint256)', error: `Transaction broadcast but receipt is unresolved: ${message}` };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async getOnChainExecutorNonce(executorAddress: string): Promise<number> {
    const executor = new Contract(executorAddress, ['function nonce() view returns (uint256)'], this.provider);
    const value = await executor.nonce();
    const nonce = Number(value);
    if (!Number.isSafeInteger(nonce) || nonce < 0) throw new Error('Executor nonce is outside safe integer range');
    return nonce;
  }

  async executeOnChainMintTo(
    operatorPrivateKey: string,
    executorAddress: string,
    targetContract: string,
    recipient: string,
    quantity: number,
    valueEth: string,
    deadline: number,
    expectedNonce: number,
    phaseHash: string,
    onBroadcast?: BroadcastHandler
  ): Promise<MintResult> {
    try {
      const wallet = new Wallet(operatorPrivateKey, this.provider);
      const valueWei = parseEther(valueEth || '0');
      const iface = new Interface([
        'function executeMintTo(address target,address recipient,uint256 quantity,uint256 value,uint256 deadline,uint256 expectedNonce,bytes32 phaseHash) payable returns (bytes32 intentHash)'
      ]);
      const data = iface.encodeFunctionData('executeMintTo', [
        targetContract,
        recipient,
        BigInt(quantity),
        valueWei,
        BigInt(deadline),
        BigInt(expectedNonce),
        phaseHash
      ]);
      const gasEstimate = await this.provider.estimateGas({
        from: wallet.address,
        to: executorAddress,
        data,
        value: valueWei
      });
      const gasLimit = (gasEstimate * 125n) / 100n;
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (!gasPrice) return { success: false, error: 'Could not determine the current gas price.' };
      const balance = await this.provider.getBalance(wallet.address);
      const requiredBalance = valueWei + gasLimit * gasPrice;
      if (balance < requiredBalance) {
        return { success: false, error: `Executor operator wallet needs ${formatEther(requiredBalance)} ETH for mint value plus gas, but has ${formatEther(balance)} ETH.` };
      }
      const tx = await wallet.sendTransaction({
        to: executorAddress,
        data,
        value: valueWei,
        gasLimit
      });
      await onBroadcast?.(tx.hash, 'executeMintTo(address,address,uint256,uint256,uint256,uint256,bytes32)');
      try {
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) {
          return {
            success: false,
            txHash: tx.hash,
            selectedFunction: 'executeMintTo(address,address,uint256,uint256,uint256,uint256,bytes32)',
            error: 'Transaction was mined but reverted on-chain.'
          };
        }
        return {
          success: true,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber ?? 0,
          gasUsed: receipt.gasUsed?.toString() ?? '21000',
          selectedFunction: 'executeMintTo(address,address,uint256,uint256,uint256,uint256,bytes32)'
        };
      } catch (waitErr: unknown) {
        const message = waitErr instanceof Error ? waitErr.message : String(waitErr);
        return {
          success: false,
          txHash: tx.hash,
          selectedFunction: 'executeMintTo(address,address,uint256,uint256,uint256,uint256,bytes32)',
          error: `Transaction broadcast but receipt is unresolved: ${message}`
        };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async executeOnChainMintToByRecipient(
    userPrivateKey: string,
    executorAddress: string,
    targetContract: string,
    recipient: string,
    quantity: number,
    valueEth: string,
    deadline: number,
    expectedNonce: number,
    phaseHash: string,
    onBroadcast?: BroadcastHandler
  ): Promise<MintResult> {
    try {
      const wallet = new Wallet(userPrivateKey, this.provider);
      if (wallet.address.toLowerCase() !== recipient.toLowerCase()) {
        return { success: false, error: 'The approved sniper wallet does not match the executor recipient.' };
      }
      const valueWei = parseEther(valueEth || '0');
      const signature = 'executeMintToByRecipient(address,address,uint256,uint256,uint256,uint256,bytes32)';
      const iface = new Interface([`function ${signature} payable returns (bytes32 intentHash)`]);
      const data = iface.encodeFunctionData('executeMintToByRecipient', [
        targetContract,
        recipient,
        BigInt(quantity),
        valueWei,
        BigInt(deadline),
        BigInt(expectedNonce),
        phaseHash
      ]);
      const gasEstimate = await this.provider.estimateGas({ from: wallet.address, to: executorAddress, data, value: valueWei });
      const gasLimit = (gasEstimate * 125n) / 100n;
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (!gasPrice) return { success: false, error: 'Could not determine the current gas price.' };
      const balance = await this.provider.getBalance(wallet.address);
      const requiredBalance = valueWei + gasLimit * gasPrice;
      if (balance < requiredBalance) {
        return { success: false, error: `Sniper wallet needs ${formatEther(requiredBalance)} ETH for mint value plus gas, but has ${formatEther(balance)} ETH.` };
      }
      const tx = await wallet.sendTransaction({ to: executorAddress, data, value: valueWei, gasLimit });
      await onBroadcast?.(tx.hash, signature);
      try {
        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) {
          return { success: false, txHash: tx.hash, selectedFunction: signature, error: 'Transaction was mined but reverted on-chain.' };
        }
        return { success: true, txHash: tx.hash, blockNumber: receipt.blockNumber ?? 0, gasUsed: receipt.gasUsed?.toString() ?? '21000', selectedFunction: signature };
      } catch (waitErr: unknown) {
        return { success: false, txHash: tx.hash, selectedFunction: signature, error: `Transaction broadcast but receipt is unresolved: ${waitErr instanceof Error ? waitErr.message : String(waitErr)}` };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Executes an auto-sell or direct transfer of an NFT from the user's wallet.
   */
  async autoSellNFT(
    privateKey: string,
    nftContract: string,
    tokenId: string,
    recipientOrBuyer: string
  ): Promise<TransferResult> {
    try {
      const wallet = new Wallet(privateKey, this.provider);
      const balance = await this.provider.getBalance(wallet.address);
      if (balance === 0n) {
        return {
          success: false,
          error: `Sniper wallet (${wallet.address}) has 0 ETH to pay Robinhood Chain gas fees. Please deposit a small amount of ETH to execute transfers.`
        };
      }

      const contract = new Contract(nftContract, ERC721_ABI, wallet);

      // Verify ownership if possible
      try {
        const owner = await contract.ownerOf(BigInt(tokenId));
        if (owner && owner.toLowerCase() !== wallet.address.toLowerCase()) {
          return {
            success: false,
            error: `Your wallet (${wallet.address}) does not own token #${tokenId} (Owned by: ${owner}).`
          };
        }
      } catch {
        // If ownerOf reverts, proceed to attempt transfer
      }

      let tx;
      let lastErr: Error | null = null;

      // 1. Try transferFrom
      try {
        tx = await contract.transferFrom(wallet.address, recipientOrBuyer, BigInt(tokenId), {
          gasLimit: 160000
        });
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }

      // 2. Try safeTransferFrom fallback
      if (!tx) {
        try {
          if (typeof contract['safeTransferFrom(address,address,uint256)'] === 'function') {
            tx = await contract['safeTransferFrom(address,address,uint256)'](wallet.address, recipientOrBuyer, BigInt(tokenId), {
              gasLimit: 160000
            });
          } else if (typeof contract.safeTransferFrom === 'function') {
            tx = await contract.safeTransferFrom(wallet.address, recipientOrBuyer, BigInt(tokenId), {
              gasLimit: 160000
            });
          }
        } catch (e2) {
          lastErr = e2 instanceof Error ? e2 : new Error(String(e2));
        }
      }

      if (!tx) {
        const readable = lastErr?.message.includes('execution reverted')
          ? `Execution reverted: ${lastErr.message.split('execution reverted:')[1]?.split('(')[0]?.trim() || lastErr.message}`
          : (lastErr?.message || 'Transfer failed on-chain.');
        return { success: false, error: readable };
      }

      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Sends ETH directly from Telegram sniper wallet back to user's main wallet.
   */
  async withdrawETH(
    privateKey: string,
    destination: string,
    amountEth?: string
  ): Promise<TransferResult> {
    try {
      const wallet = new Wallet(privateKey, this.provider);
      const balanceWei = await this.provider.getBalance(wallet.address);

      let sendValueWei = balanceWei;
      if (amountEth && parseFloat(amountEth) > 0) {
        sendValueWei = parseEther(amountEth);
      } else {
        const feeData = await this.provider.getFeeData();
        const gasPrice = feeData.gasPrice || parseEther('0.000000001');
        const estGasCost = gasPrice * 21000n;
        if (sendValueWei <= estGasCost) {
          return { success: false, error: 'Insufficient balance to cover network gas fee.' };
        }
        sendValueWei = sendValueWei - estGasCost;
      }

      const tx = await wallet.sendTransaction({
        to: destination,
        value: sendValueWei,
        gasLimit: 21000
      });

      await tx.wait();
      return { success: true, txHash: tx.hash };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }
}
