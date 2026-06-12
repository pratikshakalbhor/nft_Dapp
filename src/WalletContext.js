import React, { createContext, useState, useContext, useEffect } from 'react';
import { connectFreighter, connectAlbedo, connectXBull, WALLET_TYPES } from './walletService';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [connectedWallets, setConnectedWallets] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletType, setWalletType] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);

  // Restore session — localStorage (auto-connect)
  useEffect(() => {
    const savedWalletsStr = localStorage.getItem('connectedWallets');
    const savedActiveAddress = localStorage.getItem('walletAddress');

    if (savedWalletsStr) {
      try {
        const wallets = JSON.parse(savedWalletsStr);
        setConnectedWallets(wallets);

        if (savedActiveAddress) {
          const active = wallets.find(w => w.address === savedActiveAddress);
          if (active) {
            setWalletAddress(active.address);
            setWalletType(active.type);
          } else if (wallets.length > 0) {
            setWalletAddress(wallets[0].address);
            setWalletType(wallets[0].type);
          }
        }
      } catch (e) {
        console.error("Failed to parse wallet state", e);
      }
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (connectedWallets.length > 0) {
      localStorage.setItem('connectedWallets', JSON.stringify(connectedWallets));
    } else {
      localStorage.removeItem('connectedWallets');
    }
    
    if (walletAddress) {
      localStorage.setItem('walletAddress', walletAddress);
      localStorage.setItem('walletType', walletType);
    } else {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('walletType');
    }
  }, [connectedWallets, walletAddress, walletType]);

  const handleConnect = async (type) => {
    try {
      let result;
      switch (type) {
        case WALLET_TYPES.FREIGHTER:
          result = await connectFreighter();
          break;
        case WALLET_TYPES.ALBEDO:
          result = await connectAlbedo();
          break;
        case WALLET_TYPES.XBULL:
          result = await connectXBull();
          break;
        default:
          throw new Error('Invalid wallet type');
      }

      if (result && result.address) {
        const newWallet = {
          address: result.address,
          type: result.type,
          name: type.charAt(0) + type.slice(1).toLowerCase()
        };

        setConnectedWallets(prev => {
          if (prev.some(w => w.address === newWallet.address)) return prev;
          return [...prev, newWallet];
        });

        setWalletAddress(result.address);
        setWalletType(result.type);
        setModalOpen(false);
      }
    } catch (error) {
      console.error("Connection failed", error);
      alert(`Connection failed: ${error.message}`);
    }
  };

  //  Full logout — clears everything
  const disconnectWallet = (addressToDisconnect) => {
    const activeAddress = typeof walletAddress === 'string'
      ? walletAddress
      : walletAddress?.address;
    const targetAddress = addressToDisconnect || activeAddress;

    if (!targetAddress) return;

    const newWallets = connectedWallets.filter(w => w.address !== targetAddress);
    setConnectedWallets(newWallets);

    if (targetAddress === activeAddress) {
      if (newWallets.length > 0) {
        setWalletAddress(newWallets[0].address);
        setWalletType(newWallets[0].type);
      } else {
        //  Full clear
        setWalletAddress('');
        setWalletType('');
        localStorage.clear();
      }
    }
  };

  const switchWallet = (address) => {
    const wallet = connectedWallets.find(w => w.address === address);
    if (wallet) {
      setWalletAddress(wallet.address);
      setWalletType(wallet.type);
    }
  };

  return (
    <WalletContext.Provider value={{
      walletAddress, walletType, connectedWallets,
      connectWallet: handleConnect, disconnectWallet, switchWallet,
      isModalOpen, setModalOpen,
      setWalletAddress, setWalletType, setConnectedWallets
    }}>
      {children}
    </WalletContext.Provider>
  );
};