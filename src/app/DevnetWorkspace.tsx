import '../lib/wallet-polyfills';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { DEVNET_RPC_ENDPOINT } from '../lib/devnet';
import type { DevnetWalletSnapshot } from '../lib/wallet';
import { DevnetPanel } from './DevnetPanel';
import '@solana/wallet-adapter-react-ui/styles.css';

export function DevnetWorkspace({ onSnapshot }: { onSnapshot: (snapshot: DevnetWalletSnapshot | null) => void }) {
  return (
    <ConnectionProvider endpoint={DEVNET_RPC_ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <WalletModalProvider>
          <DevnetPanel active onSnapshot={onSnapshot} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
