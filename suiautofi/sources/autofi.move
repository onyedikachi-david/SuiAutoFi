module suiautofi::autofi {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::event;

    // Error codes
    const EInsufficientBalance: u64 = 0;
    const EInvalidStrategy: u64 = 1;
    const EInvalidRiskLevel: u64 = 2;
    const EUnauthorized: u64 = 3;

    // Strategy types
    const YIELD_FARMING: u8 = 0;
    const TRADING: u8 = 1;
    const PORTFOLIO_MANAGEMENT: u8 = 2;

    // Risk levels
    const RISK_LOW: u8 = 0;
    const RISK_MEDIUM: u8 = 1;
    const RISK_HIGH: u8 = 2;

    // Capability for admin operations
    public struct AdminCap has key { id: UID }

    // Main struct to store user's automation strategy
    public struct Strategy has key {
        id: UID,
        owner: address,
        strategy_type: u8,
        balance: Balance<SUI>,
        risk_level: u8,
        is_active: bool,
        total_returns: u64,
        last_execution: u64
    }

    // Events
    public struct StrategyCreated has copy, drop {
        strategy_id: ID,
        owner: address,
        strategy_type: u8
    }

    public struct StrategyExecuted has copy, drop {
        strategy_id: ID,
        returns: u64,
        timestamp: u64
    }

    // Initialize the protocol
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx)
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // Create a new automation strategy
    public fun create_strategy(
        strategy_type: u8,
        risk_level: u8,
        coin: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(strategy_type <= 2, EInvalidStrategy);
        assert!(risk_level <= 2, EInvalidRiskLevel);
        
        let strategy = Strategy {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            strategy_type,
            balance: coin::into_balance(coin),
            risk_level,
            is_active: true,
            total_returns: 0,
            last_execution: 0
        };

        let strategy_id = object::uid_to_inner(&strategy.id);
        event::emit(StrategyCreated {
            strategy_id,
            owner: tx_context::sender(ctx),
            strategy_type
        });

        transfer::share_object(strategy);
    }

    // Function to update strategy parameters
    public fun update_strategy(
        strategy: &mut Strategy,
        new_risk_level: u8,
        ctx: &TxContext
    ) {
        assert!(strategy.owner == tx_context::sender(ctx), EUnauthorized);
        assert!(new_risk_level <= 2, EInvalidRiskLevel);
        strategy.risk_level = new_risk_level;
    }

    // Function to pause/unpause strategy
    public fun toggle_strategy(
        strategy: &mut Strategy,
        ctx: &TxContext
    ) {
        assert!(strategy.owner == tx_context::sender(ctx), EUnauthorized);
        strategy.is_active = !strategy.is_active;
    }

    // Execute yield farming strategy
    public fun execute_yield_farming(
        strategy: &mut Strategy,
        returns: u64,
        timestamp: u64,
        ctx: &TxContext
    ) {
        assert!(strategy.owner == tx_context::sender(ctx), EUnauthorized);
        assert!(strategy.is_active, EInvalidStrategy);
        assert!(strategy.strategy_type == YIELD_FARMING, EInvalidStrategy);

        strategy.total_returns = strategy.total_returns + returns;
        strategy.last_execution = timestamp;

        event::emit(StrategyExecuted {
            strategy_id: object::uid_to_inner(&strategy.id),
            returns,
            timestamp
        });
    }

    // Execute trading strategy
    public fun execute_trading(
        strategy: &mut Strategy,
        returns: u64,
        timestamp: u64,
        ctx: &TxContext
    ) {
        assert!(strategy.owner == tx_context::sender(ctx), EUnauthorized);
        assert!(strategy.is_active, EInvalidStrategy);
        assert!(strategy.strategy_type == TRADING, EInvalidStrategy);

        strategy.total_returns = strategy.total_returns + returns;
        strategy.last_execution = timestamp;

        event::emit(StrategyExecuted {
            strategy_id: object::uid_to_inner(&strategy.id),
            returns,
            timestamp
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }
} 