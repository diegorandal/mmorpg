'use client';

import { useEffect, useState } from "react";
import { ethers } from "ethers";

type Character = {
    id: number;
    cost: string;
};

type Props = {
    onClose: () => void;
};

export default function CharactersModal({ onClose }: Props) {

    const [characters, setCharacters] = useState<Character[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // cerrar con ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // fetch transactions
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);

                const res = await fetch(
                    "https://randal.onepixperday.xyz/api/transactions-history", {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            address: 'address',
                        }),                        
                    }
                );

                if (!res.ok) throw new Error("Failed to fetch");

                const data = await res.json();
/*
                setTransactions(Array.isArray(data.body.transactions)
                    ? data.body.transactions
                    : []
                );
*/
            } catch (err) {
                console.error(err);
                setError("Could not load transactions");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

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
                    width: "520px",
                    maxWidth: "92%",
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
                    <h2 style={{ margin: 0 }}>Characters</h2>
                </div>

                {/* CONTENT */}
                {loading && (
                    <p style={{ opacity: 0.7 }}>Loading characters...</p>
                )}

                {error && (
                    <p style={{ color: "#ff5555" }}>{error}</p>
                )}

                {!loading && !error && (
                    <div
                        style={{
                            maxHeight: "320px",
                            overflowY: "auto",
                            borderRadius: "8px",
                            background: "#111"
                        }}
                    >
                        {/* TABLE HEADER */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr 1fr",
                                padding: "12px",
                                fontWeight: "bold",
                                borderBottom: "1px solid #333",
                                background: "#181818"
                            }}
                        >
                            <div>TYPE</div>
                            <div>AMOUNT</div>
                            <div>STATUS</div>
                        </div>

                    </div>
                )}

                {/* CLOSE */}
                <button
                    onClick={onClose}
                    style={{
                        marginTop: "18px",
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#333",
                        color: "white",
                        cursor: "pointer"
                    }}
                >
                    Close
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