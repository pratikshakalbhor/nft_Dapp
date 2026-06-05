#![no_std]
use soroban_sdk::{
    contract, contractimpl, symbol_short,
    Address, Env, Symbol, String,
};

const SUPPLY: Symbol = symbol_short!("SUPPLY");
const ADMIN: Symbol = symbol_short!("ADMIN");

#[contract]
pub struct SNFTToken;

#[contractimpl]
impl SNFTToken {

    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&SUPPLY, &0i128);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance()
            .get(&ADMIN).unwrap();
        admin.require_auth();

        let bal: i128 = env.storage().persistent()
            .get(&(symbol_short!("BAL"), to.clone()))
            .unwrap_or(0);
        env.storage().persistent()
            .set(&(symbol_short!("BAL"), to.clone()), &(bal + amount));

        let supply: i128 = env.storage().instance()
            .get(&SUPPLY).unwrap_or(0);
        env.storage().instance()
            .set(&SUPPLY, &(supply + amount));

        env.events().publish(
            (symbol_short!("MINT"), to.clone()),
            amount
        );
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let from_bal: i128 = env.storage().persistent()
            .get(&(symbol_short!("BAL"), from.clone()))
            .unwrap_or(0);
        assert!(from_bal >= amount, "Insufficient balance");

        env.storage().persistent()
            .set(&(symbol_short!("BAL"), from.clone()), &(from_bal - amount));

        let to_bal: i128 = env.storage().persistent()
            .get(&(symbol_short!("BAL"), to.clone()))
            .unwrap_or(0);
        env.storage().persistent()
            .set(&(symbol_short!("BAL"), to.clone()), &(to_bal + amount));

        env.events().publish(
            (symbol_short!("XFER"), from.clone()),
            (to, amount)
        );
    }

    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage().persistent()
            .get(&(symbol_short!("BAL"), account))
            .unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&SUPPLY).unwrap_or(0)
    }

    
    pub fn name(env: Env) -> String {
        String::from_str(&env, "Stellar NFT Token")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "SNFT")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }
}