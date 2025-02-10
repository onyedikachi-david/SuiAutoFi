import { Action } from './types.ts';
import { NAVISDKClient } from 'navi-sdk';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { NaviReward, NaviRewardHistory, NaviAvailableRewards } from '../types/navi.ts';

export class HarvestRewardsAction implements Action {
    name = 'harvestRewards';
    description = 'Harvest available rewards from lending positions';
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
        // Only need address for checking rewards
        return !!params.address;
    }

    async execute(params: Record<string, any>, context: Record<string, any>) {
        try {
            if (!this.validate(params)) {
                return {
                    success: false,
                    error: 'Invalid parameters. Required: address'
                };
            }

            // Check available rewards
            const availableRewards = await this.naviClient.getAddressAvailableRewards(
                params.address,
                1 // option type 1 for all rewards
            ) as NaviAvailableRewards;

            if (!availableRewards || Object.keys(availableRewards).length === 0) {
                return {
                    success: false,
                    error: 'No rewards available to harvest'
                };
            }

            // Get reward history for reference
            const rewardHistory = await this.naviClient.getClaimedRewardsHistory(
                params.address,
                1, // page
                10 // size
            ) as NaviRewardHistory;

            // Create and execute transaction
            const tx = new TransactionBlock();
            tx.moveCall({
                target: `${process.env.NAVI_PACKAGE_ID}::navi::claim_rewards`,
                arguments: [],
            });

            const result = await this.provider.signAndExecuteTransactionBlock({
                signer: this.signer,
                transactionBlock: tx,
                options: { showEffects: true, showEvents: true },
            });

            // Format rewards for response
            const formattedRewards = Object.entries(availableRewards).map(([token, amount]) => ({
                token,
                amount,
                lastClaimed: this.findLastClaimForToken(rewardHistory.rewards, token)
            }));

            return {
                success: true,
                result: {
                    txId: result.digest,
                    rewards: formattedRewards,
                    totalRewards: formattedRewards.length,
                    claimTimestamp: Date.now()
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to harvest rewards: ${error.message}`
            };
        }
    }

    private findLastClaimForToken(history: NaviReward[], token: string): number {
        const lastClaim = history.find(entry => entry.rewardToken === token);
        return lastClaim ? lastClaim.timestamp : 0;
    }
} 