'use client';

import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import { Pay } from "@/components/Pay";
import { Withdraw } from "@/components/Withdraw";
import { createPublicClient, http, formatEther } from 'viem';
import { worldchain } from 'viem/chains';

type Transaction = {
    id: number;
    type: string;
    amount: string;
    tx_hash: string;
    status: string;
};

type Props = {
    address: string;
    inGameBalance: string;
    fetchProfile: () => Promise<void>;
};

const WLD_TOKEN_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003';
const publicClient = createPublicClient({ // Cliente público para Worldchain
    chain: worldchain,
    transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
});
const WLD_ABI = [
    {
        "constant": true,
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

export default function SectionVault({ address, inGameBalance, fetchProfile }: Props) {
    const [onChainBalance, setOnChainBalance] = useState<string>("0.00");
    const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw' | null>(null);
    const [amount, setAmount] = useState<string>("");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(true);
    const actionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchOnChain = async () => {
            // Lógica para obtener balance de la wallet
            setOnChainBalance("123.45");
        };
        fetchOnChain();
    }, [address]);

    // 3. Función para hacer el scroll
    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        // 1. Usamos la referencia del elemento que disparó el evento para mayor precisión
        const target = e.target;

        // 2. Esperamos un poco más para que el teclado se despliegue totalmente
        setTimeout(() => {
            actionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start', // Intenta poner el inicio del contenedor arriba
            });

            // 3. Truco adicional: si el scrollIntoView falla, forzamos un pequeño ajuste manual
            // para asegurar que el input sea visible y no quede tras el teclado
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    const fetchWldBalance = async () => {
        
        if (!address) return;

        try {

            const raw = await publicClient.readContract({
                address: WLD_TOKEN_ADDRESS as `0x${string}`,
                abi: WLD_ABI,
                functionName: 'balanceOf',
                args: [address as `0x${string}`],
            });
            setOnChainBalance(formatEther(raw as bigint));
        } catch (e) {
            setOnChainBalance(null);
        }

    };

    const fetchHistory = async () => {
        try {
            setLoadingTx(true);
            const res = await fetch("https://randal.onepixperday.xyz/api/transactions-history", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setTransactions(Array.isArray(data.body.transactions) ? data.body.transactions : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTx(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        fetchWldBalance();

    }, [address]);

    const toggleAction = (action: 'deposit' | 'withdraw') => {
        if (activeAction === action) {
            setActiveAction(null);
        } else {
            setActiveAction(action);
            setAmount("");
        }
    };

    const handleSuccess = async () => {
        await fetchProfile();
        fetchHistory();
        setActiveAction(null);
    };

    const numericAmount = Number(amount) || 0;
    const isWithdrawValid = activeAction === 'withdraw' && numericAmount > 0 && BigInt(numericAmount) <= BigInt(inGameBalance);
    const isDepositValid = activeAction === 'deposit' && numericAmount > 0;

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            <div style={{ marginBottom: "20px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    Vault
                </h1>
            </div>

            {/* BALANCES - Sin fondo, siguiendo el estilo de secProfile */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "280px", margin: "0 auto 10px" }}>
                <Stat label="On-Chain WLD" value={`${ethers.formatUnits(onChainBalance, 18) }`} />
                <Stat label="In-Game 💰" value={`${ethers.formatUnits(inGameBalance, 18) }`} />
            </div>
            <SectionLabel label="💰 1 = 1 WLD" />
            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: "300px", margin: "0 auto 20px" }}>
                <button
                    onClick={() => toggleAction('withdraw')} style={getButtonStyle(activeAction === 'withdraw')}
                >
                    Withdraw
                </button>
                <button
                    onClick={() => toggleAction('deposit')} style={getButtonStyle(activeAction === 'deposit')}
                >
                    Deposit
                </button>
            </div>

            {/* DYNAMIC ACTION CONTENT - Este sí mantiene un recuadro para separar la UI de interacción */}
            {activeAction && (
                <div style={actionContainerStyle}>
                    <h3 style={{ fontSize: 10, opacity: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>
                        {activeAction === 'deposit' ? 'Add Funds to Game' : 'Withdraw to Wallet'}
                    </h3>

                    <input
                        type="number"
                        placeholder="0.0"
                        value={amount}
                        onFocus={handleInputFocus}
                        onChange={(e) => setAmount(e.target.value)}
                        style={inputStyle}
                    />

                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                        {[1, 5, 10].map(v => (
                            <button
                                key={v}
                                onClick={() => setAmount(String(v))}
                                disabled={activeAction === 'withdraw' && BigInt(v) > BigInt(inGameBalance)}
                                style={presetButtonStyle(activeAction === 'withdraw' && BigInt(v) > BigInt(inGameBalance))}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    <div style={{ opacity: (activeAction === 'deposit' ? isDepositValid : isWithdrawValid) ? 1 : 0.5 }}>
                        {activeAction === 'deposit' && isDepositValid && (
                            <Pay amount={numericAmount} onSuccess={handleSuccess} />
                        )}
                        {activeAction === 'withdraw' && isWithdrawValid && (
                            <Withdraw amount={numericAmount} onSuccess={handleSuccess} />
                        )}
                    </div>
                </div>
            )}

            {/* TRANSACTIONS LIST - Sin fondo oscuro, directo sobre la sección */}
            <div style={{ maxWidth: "340px", margin: "0 auto 40px", textAlign: "left" }}>
                <SectionLabel label="Recent Activity" />

                <div style={{ width: "100%" }}>
                    {/* TABLE HEADER - Solo borde inferior */}
                    <div style={tableHeaderStyle}>
                        <div>TYPE</div>
                        <div>AMOUNT</div>
                        <div style={{ textAlign: 'right' }}>STATUS</div>
                    </div>

                    {/* ROWS */}
                    <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {loadingTx ? (
                            <p style={{ padding: 15, fontSize: 12, opacity: 0.5, textAlign: 'center' }}>Loading transactions...</p>
                        ) : transactions.length === 0 ? (
                            <p style={{ padding: 15, fontSize: 12, opacity: 0.5, textAlign: 'center' }}>No history found.</p>
                        ) : transactions.map((tx) => (
                            <div key={tx.id} style={tableRowStyle}>
                                <div style={{ textTransform: "uppercase", fontWeight: 'bold' }}>{tx.type}</div>
                                <div>{ethers.formatUnits(tx.amount, 18)}</div>
                                <div style={{
                                    textAlign: 'right',
                                    color: tx.status === "confirmed" ? "#4CAF50" : tx.status === "pending" ? "#f0ad4e" : "#ff5555"
                                }}>
                                    {tx.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

// --- HELPERS (Estilo secProfile) ---

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.4, textTransform: "uppercase"}}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return <span style={{ fontSize: 12, opacity: 0.5, display: "block", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>{label}</span>;
}

const secondaryButtonStyle: React.CSSProperties = {
    flex: 1, padding: "14px", borderRadius: "12px", background: "#161616", color: "white", fontSize: "12px", border: "1px solid #222", cursor: "pointer"
};

const actionContainerStyle: React.CSSProperties = {
    background: "#0a0a0a", margin: "0 auto 30px", maxWidth: "300px", padding: "20px", borderRadius: "16px", border: "1px solid #222"
};

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px", fontSize: "1.4rem", borderRadius: "10px", border: "none", outline: "none", background: "#111", color: "white", marginBottom: "12px", textAlign: "center"
};

const presetButtonStyle = (disabled: boolean): React.CSSProperties => ({
    flex: 1, padding: "10px", borderRadius: "8px", border: "none", cursor: disabled ? "not-allowed" : "pointer", background: "#222", color: "white", fontSize: "12px", fontWeight: "bold", opacity: disabled ? 0.3 : 1
});

const tableHeaderStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 5px", fontSize: "9px", fontWeight: "bold", borderBottom: "1px solid #222", opacity: 0.4, letterSpacing: '1px'
};

const tableRowStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "14px 5px", borderBottom: "1px solid #ffffff0a", fontSize: "11px"
};

const getButtonStyle = (isActive: boolean): React.CSSProperties => {
    if (isActive) {
        return {
            ...secondaryButtonStyle, 
            flex: 1, 
            background: "radial-gradient(circle at center, #3a0402 0%, #4F0603 45%, #000000 100%)",
            color: "white",
            fontWeight: "bold",
            fontSize: "14px", 
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            border: "4px solid #D1851F",
            borderRadius: "12px",
            boxShadow: "0 0 10px rgba(209, 133, 31, 0.6)",
            transition: "all 0.2s ease",
            cursor: "pointer",
        };
    }

    // Estilo DESACTIVADO
    return {
        ...secondaryButtonStyle,
        flex: 1,
        background: "#222",
        color: "white",
        fontWeight: "bold",
        fontSize: "14px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        border: "4px solid #D1851F",
        borderRadius: "12px",
        cursor: "pointer",
    };
};