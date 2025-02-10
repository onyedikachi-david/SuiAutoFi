import { Action } from './types.ts';
import { NAVISDKClient } from 'navi-sdk';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from "@mysten/bcs";
import { NAVI_COINS, CoinInfo } from '../types/navi.ts';

export class SupplyToMarketAction implements Action {
    name = 'supplyToMarket';
    description = 'Supply assets to a lending market';
    private naviClient: NAVISDKClient;
    private provider: SuiClient;
    private signer: Ed25519Keypair;

    constructor() {
        const mnemonic = process.env.SUI_MNEMONIC;
        const rpcUrl = process.env.SUI_RPC_URL;
        
        if (!mnemonic || !rpcUrl) {
            throw new Error('Missing required environment variables: SUI_MNEMONIC or SUI_RPC_URL');
        }

        this.signer = Ed25519Keypair.deriveKeypair(mnemonic);
        this.provider = new SuiClient({ url: rpcUrl });
        this.naviClient = new NAVISDKClient({
            networkType: rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
        });
    }

    async validate(params: Record<string, any>): Promise<boolean> {
        return !!(params.coinType && params.amount && NAVI_COINS[params.coinType]);
    }

    async execute(params: Record<string, any>, context: Record<string, any>) {
        try {
            if (!this.validate(params)) {
                return {
                    success: false,
                    error: 'Invalid parameters. Required: coinType, amount'
                };
            }

            const coin = NAVI_COINS[params.coinType] as CoinInfo;
            const amount = BigInt(params.amount);

            // Check market conditions
            const poolInfo = await this.naviClient.getPoolInfo(coin);
            if (!poolInfo) {
                return {
                    success: false,
                    error: 'Market not available'
                };
            }

            // Create and execute transaction
            const tx = new TransactionBlock();
            const [coinToSupply] = tx.splitCoins(tx.gas, [tx.pure(amount)]);
            
            tx.moveCall({
                target: `${process.env.NAVI_PACKAGE_ID}::navi::deposit`,
                arguments: [coinToSupply],
            });

            const result = await this.provider.signAndExecuteTransactionBlock({
                signer: this.signer,
                transactionBlock: tx,
                options: { showEffects: true, showEvents: true },
            });

            // Calculate APY from base and boosted rates
            const supplyApy = Number(poolInfo.base_supply_rate) + Number(poolInfo.boosted_supply_rate);

            return {
                success: true,
                result: {
                    txId: result.digest,
                    market: params.coinType,
                    amount: params.amount,
                    apy: supplyApy
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to supply to market: ${error.message}`
            };
        }
    }
} 