#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Env, Address, String, Vec};

#[contracttype]
#[derive(Clone)]
pub struct NFT {
    pub id: u32,
    pub owner: Address,
    pub name: String,
    pub image: String,
    pub price: i128,
    pub listed: bool,
}

#[contract]
pub struct NFTMarketplace;

#[contractimpl]
impl NFTMarketplace {

    // Mint NFT
    pub fn mint(env: Env, owner: Address, id: u32, name: String, image: String) {
        owner.require_auth();

        let nft = NFT {
            id,
            owner: owner.clone(),
            name,
            image,
            price: 0,
            listed: false,
        };

        env.storage().instance().set(&id, &nft);
    }

    // List NFT for sale
    pub fn list_nft(env: Env, owner: Address, id: u32, price: i128) {
        owner.require_auth();

        let mut nft: NFT = env.storage().instance().get(&id).unwrap();
        assert!(nft.owner == owner, "Not owner");

        nft.price = price;
        nft.listed = true;

        env.storage().instance().set(&id, &nft);
    }

    // Buy NFT
    pub fn buy_nft(env: Env, buyer: Address, id: u32) {
        buyer.require_auth();

        let mut nft: NFT = env.storage().instance().get(&id).unwrap();
        assert!(nft.listed, "Not for sale");

        nft.owner = buyer;
        nft.listed = false;

        env.storage().instance().set(&id, &nft);
    }

    // Get NFT
    pub fn get_nft(env: Env, id: u32) -> NFT {
        env.storage().instance().get(&id).unwrap()
    }
}