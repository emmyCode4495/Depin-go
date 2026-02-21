/**
 * Solana Utilities
 * Helper functions for Solana blockchain interactions
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { SOLANA_CONFIG } from './constants';

/**
 * Create a connection to Solana cluster
 */
export function createConnection(cluster: 'devnet' | 'mainnet-beta' = 'devnet'): Connection {
  const endpoint =
    cluster === 'devnet'
      ? SOLANA_CONFIG.DEVNET_ENDPOINT
      : SOLANA_CONFIG.MAINNET_ENDPOINT;

  return new Connection(endpoint, SOLANA_CONFIG.COMMITMENT);
}

/**
 * Shorten a public key for display
 */
export function shortenAddress(address: PublicKey | string, chars: number = 4): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  return `${addressStr.slice(0, chars)}...${addressStr.slice(-chars)}`;
}

/**
 * Check if a string is a valid Solana address
 */
export function isValidAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Solana explorer URL for a transaction
 */
export function getExplorerUrl(
  signature: string,
  cluster: 'devnet' | 'mainnet-beta' = 'devnet'
): string {
  const clusterParam = cluster === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
}

/**
 * Get Solana explorer URL for an address
 */
export function getAddressExplorerUrl(
  address: PublicKey | string,
  cluster: 'devnet' | 'mainnet-beta' = 'devnet'
): string {
  const addressStr = typeof address === 'string' ? address : address.toBase58();
  const clusterParam = cluster === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/address/${addressStr}${clusterParam}`;
}

/**
 * Wait for transaction confirmation
 */
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed'
): Promise<boolean> {
  const result = await connection.confirmTransaction(signature, commitment);
  return !result.value.err;
}

/**
 * Get SOL balance for an address
 */
export async function getBalance(
  connection: Connection,
  address: PublicKey
): Promise<number> {
  const balance = await connection.getBalance(address);
  return balance / 1e9; // Convert lamports to SOL
}

/**
 * Format SOL amount for display
 */
export function formatSol(lamports: number): string {
  const sol = lamports / 1e9;
  return sol.toFixed(4);
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1e9);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

/**
 * Get recent blockhash
 */
export async function getRecentBlockhash(connection: Connection): Promise<string> {
  const { blockhash } = await connection.getLatestBlockhash();
  return blockhash;
}

/**
 * Check if transaction was successful
 */
export async function isTransactionSuccessful(
  connection: Connection,
  signature: string
): Promise<boolean> {
  try {
    const status = await connection.getSignatureStatus(signature);
    return status.value?.confirmationStatus === 'confirmed' && !status.value?.err;
  } catch {
    return false;
  }
}

/**
 * Get transaction fee estimate
 */
export async function estimateTransactionFee(
  connection: Connection,
  transaction: Transaction
): Promise<number> {
  const { feeCalculator } = await connection.getRecentBlockhash();
  return feeCalculator.lamportsPerSignature * transaction.signatures.length;
}

/**
 * Airdrop SOL (devnet only)
 */
export async function airdropSol(
  connection: Connection,
  address: PublicKey,
  amount: number = 1
): Promise<string> {
  const signature = await connection.requestAirdrop(address, solToLamports(amount));
  await confirmTransaction(connection, signature);
  return signature;
}

/**
 * Get account info
 */
export async function getAccountInfo(connection: Connection, address: PublicKey) {
  return await connection.getAccountInfo(address);
}

/**
 * Parse transaction error
 */
export function parseTransactionError(error: any): string {
  if (!error) return 'Unknown error';

  if (typeof error === 'string') return error;

  if (error.message) return error.message;

  if (error.logs) {
    // Try to extract meaningful error from logs
    const errorLog = error.logs.find((log: string) => log.includes('Error:'));
    if (errorLog) return errorLog;
  }

  return JSON.stringify(error);
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
}

/**
 * Check if cluster is reachable
 */
export async function isClusterReachable(cluster: 'devnet' | 'mainnet-beta'): Promise<boolean> {
  try {
    const connection = createConnection(cluster);
    await connection.getVersion();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current slot
 */
export async function getCurrentSlot(connection: Connection): Promise<number> {
  return await connection.getSlot();
}

/**
 * Get epoch info
 */
export async function getEpochInfo(connection: Connection) {
  return await connection.getEpochInfo();
}

/**
 * Create a program derived address (PDA)
 */
export function createProgramAddress(
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(seeds, programId);
  return pda;
}

/**
 * Validate transaction signature format
 */
export function isValidSignature(signature: string): boolean {
  // Solana signatures are base58 encoded and typically 87-88 characters
  return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

/**
 * Get minimum rent exemption for account size
 */
export async function getMinimumBalanceForRentExemption(
  connection: Connection,
  dataLength: number
): Promise<number> {
  return await connection.getMinimumBalanceForRentExemption(dataLength);
}

/**
 * Calculate transaction size
 */
export function calculateTransactionSize(transaction: Transaction): number {
  return transaction.serialize().length;
}

/**
 * Check if account exists
 */
export async function accountExists(
  connection: Connection,
  address: PublicKey
): Promise<boolean> {
  const accountInfo = await connection.getAccountInfo(address);
  return accountInfo !== null;
}