import { Action } from './types.ts';
import { NAVISDKClient } from 'navi-sdk';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { NAVI_COINS, CoinInfo } from '../types/navi.ts';

export class WithdrawFromMarketAction implements Action {
    name = 'withdrawFromMarket';
    description = 'Withdraw assets from a lending market';
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

            // Check market conditions and user position
            const poolInfo = await this.naviClient.getPoolInfo(coin);
            const portfolio = await this.naviClient.getAllNaviPortfolios();
            const position = portfolio.get(params.coinType);

            if (!poolInfo || !position) {
                return {
                    success: false,
                    error: 'Market not available or no position found'
                };
            }

            if (position.supplyBalance < Number(amount)) {
                return {
                    success: false,
                    error: 'Insufficient balance to withdraw'
                };
            }

            // Check if withdrawal would affect health factor
            const address = this.signer.getPublicKey().toSuiAddress();
            const currentHealth = await this.naviClient.getHealthFactor(address);
            const estimatedHealth = await this.naviClient.getDynamicHealthFactor(
                address,
                coin,
                -Number(amount), // negative for withdrawal
                0,
                false
            );

            if (Number(estimatedHealth) < 1.05) {
                return {
                    success: false,
                    error: 'Withdrawal would put position at risk. Health factor too low.'
                };
            }

            // Create and execute transaction
            const tx = new TransactionBlock();
            tx.moveCall({
                target: `${process.env.NAVI_PACKAGE_ID}::navi::withdraw`,
                arguments: [tx.pure(amount)],
            });

            const result = await this.provider.signAndExecuteTransactionBlock({
                signer: this.signer,
                transactionBlock: tx,
                options: { showEffects: true, showEvents: true },
            });

            return {
                success: true,
                result: {
                    txId: result.digest,
                    market: params.coinType,
                    amount: params.amount,
                    healthFactorBefore: currentHealth,
                    healthFactorAfter: estimatedHealth
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to withdraw from market: ${error.message}`
            };
        }
    }
} 