import { Provider } from './types.ts';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient } from '@mysten/sui.js/client';

export class WalletProvider implements Provider {
    name = 'walletProvider';
    private provider: SuiClient;
    private signer: Ed25519Keypair;
    private rpcUrl: string;

    constructor() {
        const mnemonic = process.env.SUI_MNEMONIC;
        const rpcUrl = process.env.SUI_RPC_URL;
        
        if (!mnemonic || !rpcUrl) {
            throw new Error('Missing SUI_MNEMONIC or SUI_RPC_URL in environment');
        }

        this.rpcUrl = rpcUrl;
        this.signer = Ed25519Keypair.deriveKeypair(mnemonic);
        this.provider = new SuiClient({ url: rpcUrl });
    }

    async getContext() {
        const address = this.signer.getPublicKey().toSuiAddress();
        const balance = await this.getBalance(address);
        
        return {
            address,
            balance,
            network: this.rpcUrl,
            isConnected: true
        };
    }

    private async getBalance(address: string) {
        const balance = await this.provider.getBalance({
            owner: address
        });
        return balance;
    }

    async initialize() {
        // Test connection
        await this.provider.getLatestCheckpointSequenceNumber();
    }
} 