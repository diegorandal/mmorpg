'use client';

import { useEffect, useState } from "react";
import { Withdraw } from "@/components/Withdraw";

type Props = {
    balance: number;      // balance ya formateado (WLD)
    onClose: () => void;
    onSuccess?: () => void;
};

export default function WithdrawModal({
    balance,
    onClose,
    onSuccess
}: Props) {

    const [amount, setAmount] = useState<string>("");

    // cerrar con ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    const numericAmount = Number(amount) || 0;

    const isValid =
        numericAmount > 0 &&
        numericAmount <= balance;

    const selectPreset = (value: number) => {
        setAmount(String(value));
    };

    const selectMax = () => {
        setAmount(String(balance));
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                animation: "fadeIn 0.15s ease"
            }}
        >
            {/* MODAL */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "420px",
                    maxWidth: "90%",
                    background: "#1e1e1e",
                    borderRadius: "14px",
                    padding: "24px",
                    color: "white",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    animation: "scaleIn 0.15s ease"
                }}
            >
                {/* HEADER */}
                <div style={{ marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>Withdraw WLD</h2>

                    <p style={{ opacity: 0.7, marginTop: 6 }}>
                        Available balance: <b>{balance.toFixed(4)} WLD</b>
                    </p>
                </div>

                {/* INPUT */}
                <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "14px",
                        fontSize: "1.4rem",
                        borderRadius: "10px",
                        border: "none",
                        outline: "none",
                        background: "#111",
                        color: "white",
                        marginBottom: "14px"
                    }}
                />

                {/* PRESETS */}
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        marginBottom: "14px"
                    }}
                >
                    {[1, 5, 10].map(v => (
                        <button
                            key={v}
                            onClick={() => selectPreset(v)}
                            disabled={v > balance}
                            style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                background: v > balance ? "#222" : "#2c2c2c",
                                color: "white",
                                fontWeight: "bold",
                                opacity: v > balance ? 0.4 : 1
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>

                {/* MAX BUTTON */}
                <button
                    onClick={selectMax}
                    style={{
                        width: "100%",
                        marginBottom: "20px",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#477fe7",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: "bold"
                    }}
                >
                    MAX
                </button>

                {/* WITHDRAW COMPONENT */}
                <div
                    style={{
                        opacity: isValid ? 1 : 0.5,
                        pointerEvents: isValid ? "auto" : "none"
                    }}
                >
                    {isValid && (
                        <Withdraw
                            amount={numericAmount}
                            onSuccess={() => {
                                onSuccess?.();
                                onClose();
                            }}
                        />
                    )}
                </div>

                {/* CLOSE */}
                <button
                    onClick={onClose}
                    style={{
                        marginTop: "16px",
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#333",
                        color: "white",
                        cursor: "pointer"
                    }}
                >
                    Cancel
                </button>
            </div>

            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0 }
          to { opacity: 1 }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
        </div>
    );
}