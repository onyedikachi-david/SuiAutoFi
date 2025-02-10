import { CheckHealthAction } from './checkHealth.ts';
import { SupplyToMarketAction } from './supplyToMarket.ts';
import { WithdrawFromMarketAction } from './withdrawFromMarket.ts';
import { ExecuteSwapAction } from './executeSwap.ts';
import { HarvestRewardsAction } from './harvestRewards.ts';
import { OptimizeYieldAction } from './optimizeYield.ts';

export const actions = [
    new CheckHealthAction(),
    new SupplyToMarketAction(),
    new WithdrawFromMarketAction(),
    new ExecuteSwapAction(),
    new HarvestRewardsAction(),
    new OptimizeYieldAction()
]; 