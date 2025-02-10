#[test_only]
module suiautofi::autofi_tests {
    use sui::test_scenario::{Self as test, Scenario};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use sui::object;
    use suiautofi::autofi::{Self, Strategy, AdminCap};
    use suiautofi::portfolio::{Self, Portfolio};

    // Test addresses
    const ADMIN: address = @0xAD;
    const USER: address = @0xB0B;

    // Test setup helper
    fun setup_test(): Scenario {
        let mut scenario = test::begin(ADMIN);
        {
            autofi::init_for_testing(test::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_create_strategy() {
        let mut scenario = setup_test();
        
        // Create a strategy
        test::next_tx(&mut scenario, USER);
        {
            let coin = coin::mint_for_testing<SUI>(1000, test::ctx(&mut scenario));
            autofi::create_strategy(0, 1, coin, test::ctx(&mut scenario));
        };

        // Verify strategy was created
        test::next_tx(&mut scenario, USER);
        {
            assert!(test::has_most_recent_shared<Strategy>(), 0);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_create_and_manage_portfolio() {
        let mut scenario = setup_test();
        
        // Create strategy first
        test::next_tx(&mut scenario, USER);
        {
            let coin = coin::mint_for_testing<SUI>(1000, test::ctx(&mut scenario));
            autofi::create_strategy(0, 1, coin, test::ctx(&mut scenario));
        };

        // Get strategy ID and create portfolio
        test::next_tx(&mut scenario, USER);
        {
            let strategy = test::take_shared<Strategy>(&mut scenario);
            let strategy_id = object::id(&strategy);
            portfolio::create_portfolio(strategy_id, test::ctx(&mut scenario));
            test::return_shared(strategy);
        };

        // Add assets to portfolio
        test::next_tx(&mut scenario, USER);
        {
            let mut portfolio = test::take_shared<Portfolio>(&mut scenario);
            portfolio::add_asset(&mut portfolio, 0, 50, 500, test::ctx(&mut scenario));
            portfolio::add_asset(&mut portfolio, 1, 50, 500, test::ctx(&mut scenario));
            test::return_shared(portfolio);
        };

        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = suiautofi::autofi::EInvalidStrategy)]
    fun test_invalid_strategy_type() {
        let mut scenario = setup_test();
        
        test::next_tx(&mut scenario, USER);
        {
            let coin = coin::mint_for_testing<SUI>(1000, test::ctx(&mut scenario));
            // Try to create strategy with invalid type (3)
            autofi::create_strategy(3, 1, coin, test::ctx(&mut scenario));
        };
        
        test::end(scenario);
    }
} 