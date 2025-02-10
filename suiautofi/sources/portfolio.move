module suiautofi::portfolio {
    use std::vector;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;
    use suiautofi::autofi::{Self, Strategy};

    // Error codes
    const EInvalidAllocation: u64 = 0;
    const EUnauthorized: u64 = 1;

    // Asset allocation limits
    const MIN_ALLOCATION: u8 = 0;
    const MAX_ALLOCATION: u8 = 100;

    // Portfolio asset struct
    public struct PortfolioAsset has store {
        asset_type: u8,
        allocation: u8,
        current_value: u64
    }

    // Portfolio management struct
    public struct Portfolio has key {
        id: UID,
        owner: address,
        strategy: ID,
        assets: vector<PortfolioAsset>,
        last_rebalance: u64
    }

    // Events
    public struct PortfolioCreated has copy, drop {
        portfolio_id: ID,
        owner: address,
        strategy: ID
    }

    public struct PortfolioRebalanced has copy, drop {
        portfolio_id: ID,
        timestamp: u64
    }

    // Create a new portfolio
    public fun create_portfolio(
        strategy_id: ID,
        ctx: &mut TxContext
    ) {
        let portfolio = Portfolio {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            strategy: strategy_id,
            assets: vector::empty(),
            last_rebalance: 0
        };

        event::emit(PortfolioCreated {
            portfolio_id: object::uid_to_inner(&portfolio.id),
            owner: tx_context::sender(ctx),
            strategy: strategy_id
        });

        transfer::share_object(portfolio);
    }

    // Add asset to portfolio
    public fun add_asset(
        portfolio: &mut Portfolio,
        asset_type: u8,
        allocation: u8,
        current_value: u64,
        ctx: &TxContext
    ) {
        assert!(portfolio.owner == tx_context::sender(ctx), EUnauthorized);
        assert!(allocation >= MIN_ALLOCATION && allocation <= MAX_ALLOCATION, EInvalidAllocation);

        let asset = PortfolioAsset {
            asset_type,
            allocation,
            current_value
        };

        vector::push_back(&mut portfolio.assets, asset);
    }

    // Rebalance portfolio
    public fun rebalance_portfolio(
        portfolio: &mut Portfolio,
        timestamp: u64,
        ctx: &TxContext
    ) {
        assert!(portfolio.owner == tx_context::sender(ctx), EUnauthorized);
        
        portfolio.last_rebalance = timestamp;

        event::emit(PortfolioRebalanced {
            portfolio_id: object::uid_to_inner(&portfolio.id),
            timestamp
        });
    }
} 