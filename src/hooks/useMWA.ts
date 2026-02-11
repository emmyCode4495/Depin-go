import { useState, useCallback } from 'react';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey } from '@solana/web3.js';

export function useMWA() {
  const [walletAddress, setWalletAddress] = useState<PublicKey | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      const result = await transact(async (wallet) => {
        const authorization = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'DePIN-Go',
            uri: 'https://depingo.io',
            icon: 'favicon.ico',
          },
        });

        return {
          address: authorization.accounts[0].address,
          authToken: authorization.auth_token,
        };
      });

      const pubkey = new PublicKey(result.address);
      setWalletAddress(pubkey);
      
      return pubkey;
    } catch (error) {
      console.error('MWA connection failed:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return {
    walletAddress,
    isConnecting,
    connect,
    disconnect,
    isConnected: walletAddress !== null,
  };
}