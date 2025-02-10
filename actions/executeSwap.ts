import { Action } from './types.ts';
import { NAVISDKClient } from 'navi-sdk';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { NAVI_COINS, CoinInfo, NaviQuote, Dex } from '../types/navi.ts';

export class ExecuteSwapAction implements Action {
    name = 'executeSwap';
    description = 'Execute a token swap using the best available route';
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
        return !!(
            params.fromCoin && 
            params.toCoin && 
            params.amount && 
            NAVI_COINS[params.fromCoin] && 
            NAVI_COINS[params.toCoin]
        );
    }

    async execute(params: Record<string, any>, context: Record<string, any>) {
        try {
            if (!this.validate(params)) {
                return {
                    success: false,
                    error: 'Invalid parameters. Required: fromCoin, toCoin, amount'
                };
            }

            const fromCoin = NAVI_COINS[params.fromCoin] as CoinInfo;
            const toCoin = NAVI_COINS[params.toCoin] as CoinInfo;
            const amount = BigInt(params.amount);

            // Get the best swap route
            const quote = await this.naviClient.getQuote(
                fromCoin.address,
                toCoin.address,
                amount.toString(),
                process.env.NAVI_API_KEY,
                {
                    baseUrl: 'https://open-aggregator-api.naviprotocol.io',
                    dexList: [
                        Dex.CETUS,
                        Dex.TURBOS,
                        Dex.KRIYA_V2,
                        Dex.KRIYA_V3,
                        Dex.AFTERMATH,
                        Dex.DEEPBOOK,
                        Dex.BLUEFIN
                    ],
                    byAmountIn: true,
                    depth: 3
                }
            ) as NaviQuote;

            if (!quote || !quote.routes || quote.routes.length === 0) {
                return {
                    success: false,
                    error: 'No valid swap route found'
                };
            }

            const minAmountOut = this.calculateMinAmountOut(
                quote.routes[0].outAmount,
                params.slippage || 0.5 // Default 0.5% slippage
            );

            // Create and execute transaction
            const tx = new TransactionBlock();
            const [coin] = tx.splitCoins(tx.gas, [tx.pure(amount)]);

            tx.moveCall({
                target: `${process.env.NAVI_PACKAGE_ID}::navi::swap`,
                arguments: [
                    coin,
                    tx.pure(minAmountOut),
                    tx.pure(quote.routes[0].path)
                ],
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
                    fromCoin: params.fromCoin,
                    toCoin: params.toCoin,
                    amountIn: params.amount,
                    expectedAmountOut: quote.routes[0].outAmount,
                    minAmountOut,
                    route: quote.routes[0].path
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to execute swap: ${error.message}`
            };
        }
    }

    private calculateMinAmountOut(amountOut: string, slippagePercent: number): bigint {
        const amount = BigInt(amountOut);
        const slippageFactor = 100_000n - BigInt(slippagePercent * 1000);
        return (amount * slippageFactor) / 100_000n;
    }
} 