import { AutoFiService } from '../services/autofi-service';
import { PortfolioAsset, LendingPosition } from '../sui/strategy';

async function main() {
    // Initialize connection to Sui network
    const rpcUrl = 'https://fullnode.testnet.sui.io';

    // Your deployed package ID and private key
    const packageId = 'YOUR_PACKAGE_ID';
    const privateKey = 'YOUR_PRIVATE_KEY';

    // Create AutoFi service instance
    const autoFi = new AutoFiService(rpcUrl, packageId, privateKey);

    // Example market data
    const marketData = [
        { price: 1000, volume: 5000, timestamp: Date.now() - 3600000 }, // 1 hour ago
        { price: 1050, volume: 6000, timestamp: Date.now() - 1800000 }, // 30 mins ago
        { price: 1025, volume: 5500, timestamp: Date.now() },           // current
    ];

    // Create an optimized strategy
    const strategyId = await autoFi.createOptimizedStrategy(
        {
            type: 0, // YIELD_FARMING
            amount: BigInt(1000000000), // 1 SUI
        },
        marketData
    );
    console.log('Created strategy:', strategyId);

    // Create and optimize portfolio
    const initialAssets: PortfolioAsset[] = [
        {
            assetType: 0,
            allocation: 50,
            currentValue: BigInt(500000000)
        },
        {
            assetType: 1,
            allocation: 50,
            currentValue: BigInt(500000000)
        }
    ];

    const portfolioId = await autoFi.optimizeAndCreatePortfolio(
        strategyId,
        initialAssets
    );
    console.log('Created portfolio:', portfolioId);

    // Execute yield farming strategy
    const availableProtocols = ['protocol1', 'protocol2', 'protocol3'];
    const currentYields = new Map([
        ['protocol1', 0.05], // 5% APY
        ['protocol2', 0.08], // 8% APY
        ['protocol3', 0.12], // 12% APY
    ]);

    await autoFi.executeYieldFarmingStrategy(
        strategyId,
        availableProtocols,
        currentYields
    );
    console.log('Executed yield farming strategy');

    // Execute trading strategy
    await autoFi.executeTradingStrategy(
        strategyId,
        marketData,
        '1h'
    );
    console.log('Executed trading strategy');

    // Execute lending strategy
    const lendingAmount = BigInt(500000000); // 0.5 SUI
    await autoFi.executeLendingStrategy(
        strategyId,
        lendingAmount,
        0.08 // Minimum 8% APY
    );
    console.log('Executed lending strategy');

    // Example of rebalancing a lending position
    const currentPosition: LendingPosition = {
        protocol: 'NAVI',
        marketId: 'SUI',
        amount: lendingAmount,
        apy: 0.08
    };
    await autoFi.rebalanceLendingPosition(
        strategyId,
        currentPosition,
        0.02 // Rebalance if 2% better APY found
    );
    console.log('Rebalanced lending position');
}

main().catch(console.error); 