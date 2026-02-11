import React, { useMemo, ReactNode } from 'react';
// import { ConnectionProvider } from '@solana/web3.js';
import { clusterApiUrl, Connection } from '@solana/web3.js';

interface SolanaProviderProps {
  children: ReactNode;
}

export function SolanaProvider({ children }: SolanaProviderProps) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  
  const connection = useMemo(
    () => new Connection(endpoint, 'confirmed'),
    [endpoint]
  );

  return (
    <ConnectionContext.Provider value={connection}>
      {children}
    </ConnectionContext.Provider>
  );
}

const ConnectionContext = React.createContext<Connection | null>(null);

export function useConnection() {
  const context = React.useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within SolanaProvider');
  }
  return context;
}