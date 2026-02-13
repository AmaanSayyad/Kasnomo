'use client';

import React from 'react';
import { useOverflowStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Globe, ShieldCheck } from 'lucide-react';

export const WalletConnectModal: React.FC = () => {
    const isOpen = useOverflowStore(state => state.isConnectModalOpen);
    const setOpen = useOverflowStore(state => state.setConnectModalOpen);
    const setPreferredNetwork = useOverflowStore(state => state.setPreferredNetwork);

    const handleKaspaConnect = async () => {
        if (typeof window === 'undefined') return;

        const kasware = (window as any).kasware;
        if (!kasware) {
            window.open('https://www.kasware.xyz/', '_blank');
            return;
        }

        try {
            const accounts = await kasware.requestAccounts();
            if (accounts && accounts.length > 0) {
                const address = accounts[0];
                setPreferredNetwork('KAS');
                useOverflowStore.getState().setNetwork('KAS');
                useOverflowStore.getState().setAddress(address);
                useOverflowStore.getState().setIsConnected(true);
                
                // Fetch both wallet and house balance
                useOverflowStore.getState().refreshWalletBalance();
                const fetchBalance = useOverflowStore.getState().fetchBalance;
                if (fetchBalance) {
                    fetchBalance(address);
                }
                
                setOpen(false);
            }
        } catch (error) {
            console.error('KasWare connection error:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setOpen(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Connect Wallet</h2>
                            <p className="text-sm text-gray-400 mt-1">Play on Kaspa Testnet</p>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors group"
                        >
                            <X className="w-5 h-5 text-gray-500 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Options */}
                    <div className="p-6 space-y-3">
                        {/* KasWare Option */}
                        <button
                            onClick={handleKaspaConnect}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform">
                                <Wallet className="w-7 h-7 text-purple-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white">KasWare Wallet</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400 font-bold uppercase tracking-wider">KAS</span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">Connect to Kaspa Testnet</p>
                            </div>
                            <Globe className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
                        </button>
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-white/5 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                            Powered by Kasnomo Protocol
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

