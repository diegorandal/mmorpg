'use client';

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Pay } from "@/components/Pay";
import { Withdraw } from "@/components/Withdraw";

type Transaction = {
    id: number;
    type: string;
    amount: string;
    tx_hash: string;
    status: string;
};

type Props = {
    address: string;
    inGameBalance: number;
    fetchProfile: () => Promise<void>;
};

export default function SectionVault({ address, inGameBalance, fetchProfile }: Props) {
    // Estados para balances
    const [onChainBalance, setOnChainBalance] = useState<string>("0.00");

    // Estados de UI
    const [activeAction, setActiveAction] = useState<'deposit' | 'withdraw' | null>(null);
    const [amount, setAmount] = useState<string>("");

    // Estados de transacciones
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loadingTx, setLoadingTx] = useState(true);

    // Effect para On-Chain Balance (Placeholder solicitado)
    useEffect(() => {
        const fetchOnChain = async () => {
            // Lógica futura aquí
            setOnChainBalance("123.45");
        };
        fetchOnChain();
    }, [address]);

    // Fetch historial de transacciones
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
    const isWithdrawValid = activeAction === 'withdraw' && numericAmount > 0 && numericAmount <= inGameBalance;
    const isDepositValid = activeAction === 'deposit' && numericAmount > 0;

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            <div style={{ marginBottom: "30px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    Vault
                </h1>
            </div>

            {/* BALANCES GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", maxWidth: "320px", margin: "0 auto 25px" }}>
                <Stat label="On-Chain Balance" value={`${onChainBalance} WLD`} />
                <Stat label="In-Game Balance" value={`${inGameBalance.toFixed(2)} WLD`} />
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: "320px", margin: "0 auto 20px" }}>
                <button
                    onClick={() => toggleAction('deposit')}
                    style={{ ...secondaryButtonStyle, borderColor: activeAction === 'deposit' ? '#D1851F' : '#222' }}
                >
                    Deposit
                </button>
                <button
                    onClick={() => toggleAction('withdraw')}
                    style={{ ...secondaryButtonStyle, borderColor: activeAction === 'withdraw' ? '#D1851F' : '#222' }}
                >
                    Withdraw
                </button>
            </div>

            {/* DYNAMIC ACTION CONTENT (Deposit/Withdraw) */}
            {activeAction && (
                <div style={actionContainerStyle}>
                    <h3 style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase', color: '#D1851F' }}>
                        {activeAction === 'deposit' ? 'Add Funds to Game' : 'Withdraw to Wallet'}
                    </h3>

                    <input
                        type="number"
                        placeholder="0.0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={inputStyle}
                    />

                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                        {[1, 5, 10].map(v => (
                            <button
                                key={v}
                                onClick={() => setAmount(String(v))}
                                disabled={activeAction === 'withdraw' && v > inGameBalance}
                                style={presetButtonStyle(activeAction === 'withdraw' && v > inGameBalance)}
                            >
                                {v}
                            </button>
                        ))}
                        {activeAction === 'withdraw' && (
                            <button onClick={() => setAmount(String(inGameBalance))} style={presetButtonStyle(false)}>MAX</button>
                        )}
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

            {/* TRANSACTIONS LIST */}
            <div style={{ maxWidth: "340px", margin: "0 auto", textAlign: "left" }}>
                <span style={sectionLabelStyle}>Recent Activity</span>
                <div style={tableContainerStyle}>
                    {/* HEADER */}
                    <div style={tableHeaderStyle}>
                        <div>TYPE</div>
                        <div>AMOUNT</div>
                        <div style={{ textAlign: 'right' }}>STATUS</div>
                    </div>

                    {/* ROWS */}
                    <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {loadingTx ? (
                            <p style={{ padding: 15, fontSize: 12, opacity: 0.5 }}>Loading transactions...</p>
                        ) : transactions.length === 0 ? (
                            <p style={{ padding: 15, fontSize: 12, opacity: 0.5 }}>No history found.</p>
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

// --- STYLES & HELPERS ---

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ textAlign: "center", background: "#111", padding: "12px", borderRadius: "12px", border: "1px solid #222" }}>
            <div style={{ fontSize: 9, opacity: 0.5, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#eee" }}>{value}</div>
        </div>
    );
}

const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10, opacity: 0.5, display: "block", textTransform: "uppercase", marginBottom: 12, textAlign: "center"
};

const secondaryButtonStyle: React.CSSProperties = {
    flex: 1, padding: "14px", borderRadius: "12px", background: "#161616", color: "white", fontSize: "12px", border: "2px solid #222", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s"
};

const actionContainerStyle: React.CSSProperties = {
    background: "#111", margin: "0 auto 25px", maxWidth: "320px", padding: "20px", borderRadius: "16px", border: "1px solid #333"
};

const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px", fontSize: "1.2rem", borderRadius: "8px", border: "none", outline: "none", background: "#1a1a1a", color: "white", marginBottom: "12px", textAlign: "center"
};

const presetButtonStyle = (disabled: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px", borderRadius: "6px", border: "none", cursor: disabled ? "not-allowed" : "pointer", background: "#222", color: "white", fontSize: "11px", fontWeight: "bold", opacity: disabled ? 0.3 : 1
});

const tableContainerStyle: React.CSSProperties = {
    background: "#111", borderRadius: "12px", border: "1px solid #222", overflow: "hidden"
};

const tableHeaderStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "10px 15px", fontSize: "10px", fontWeight: "bold", background: "#181818", borderBottom: "1px solid #222", opacity: 0.6
};

const tableRowStyle: React.CSSProperties = {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "12px 15px", borderBottom: "1px solid #1a1a1a", fontSize: "11px"
};