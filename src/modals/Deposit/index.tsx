'use client';

import { useEffect, useState } from "react";
import { Pay } from "@/components/Pay";

type Props = {
    onClose: () => void;
    onSuccess?: () => void;
};

export default function Deposit({
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

    const numericAmount = Number(amount);
    const isValid = numericAmount > 0;

    const selectPreset = (value: number) => {
        setAmount(String(value));
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
                    <h2 className="text-2xl font-bold mb-4" style={{ marginTop: 0 }}>Deposit WLD</h2>
                    <p style={{ opacity: 0.7, marginTop: 6 }}>
                        Select how much you want to deposit
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
                        marginBottom: "16px"
                    }}
                />

                {/* PRESETS */}
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        marginBottom: "22px"
                    }}
                >
                    {[1, 5, 10].map(v => (
                        <button
                            key={v}
                            onClick={() => selectPreset(v)}
                            style={{
                                flex: 1,
                                padding: "10px",
                                borderRadius: "8px",
                                border: "none",
                                cursor: "pointer",
                                background: "#2c2c2c",
                                color: "white",
                                fontWeight: "bold"
                            }}
                        >
                            {v} WLD
                        </button>
                    ))}
                </div>

                {/* PAY BUTTON AREA */}
                <div style={{ opacity: isValid ? 1 : 0.5, pointerEvents: isValid ? "auto" : "none" }}>
                    {isValid && (
                        <Pay
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

            {/* animations */}
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