import { Action } from './types.ts';
import { NAVISDKClient } from 'navi-sdk';

export class CheckHealthAction implements Action {
    name = 'checkHealth';
    description = 'Check the health factor of your positions across protocols';
    private naviClient: NAVISDKClient;

    constructor() {
        const rpcUrl = process.env.SUI_RPC_URL;
        this.naviClient = new NAVISDKClient({
            networkType: rpcUrl?.includes('testnet') ? 'testnet' : 'mainnet'
        });
    }

    async validate(params: Record<string, any>): Promise<boolean> {
        return !!params.address;
    }

    async execute(params: Record<string, any>, context: Record<string, any>) {
        try {
            if (!params.address) {
                return {
                    success: false,
                    error: 'Address is required'
                };
            }

            // Get health factors from NAVI
            const naviHealth = await this.naviClient.getHealthFactor(params.address);
            
            // Get dynamic health factors for active positions
            const portfolio = await this.naviClient.getAllNaviPortfolios();
            const positions = [];
            
            for (const [market, balances] of portfolio.entries()) {
                if (balances.borrowBalance > 0) {
                    positions.push({
                        market,
                        health: naviHealth,
                        borrowed: balances.borrowBalance,
                        supplied: balances.supplyBalance
                    });
                }
            }

            return {
                success: true,
                result: {
                    overallHealth: naviHealth,
                    status: this.getHealthStatus(naviHealth),
                    positions,
                    recommendations: this.getRecommendations(naviHealth, positions)
                }
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to check health: ${error.message}`
            };
        }
    }

    private getHealthStatus(healthFactor: number): 'HEALTHY' | 'CAUTION' | 'DANGER' {
        if (healthFactor >= 1.5) return 'HEALTHY';
        if (healthFactor >= 1.1) return 'CAUTION';
        return 'DANGER';
    }

    private getRecommendations(healthFactor: number, positions: any[]): string[] {
        const recommendations: string[] = [];

        if (healthFactor < 1.1) {
            recommendations.push('URGENT: Health factor critically low. Consider repaying some debt or adding collateral.');
        } else if (healthFactor < 1.5) {
            recommendations.push('WARNING: Health factor below safe threshold. Monitor closely.');
        }

        // Add position-specific recommendations
        for (const position of positions) {
            if (position.borrowed > 0) {
                recommendations.push(
                    `${position.market}: Consider adjusting position to improve health factor.`
                );
            }
        }

        return recommendations;
    }
} 