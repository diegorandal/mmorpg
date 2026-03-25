'use client';

import { useEffect, useState } from "react";
import Confetti from 'react-confetti';

type Props = {
    address: string;
    onClose: () => void;
};

type ResultResponse = {
    result: "exit" | "death" | "disconnect" | "exit_free" | "death_free" | "disconnect_free";
    pot: number;
    hp: number;
    kills: number;
    xp: number;
};

export default function LastResultModal({ address, onClose }: Props) {

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [data, setData] = useState<ResultResponse | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }, []);

    // ESC close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // FETCH RESULT
    useEffect(() => {
        const fetchResult = async () => {
            try {
                setLoading(true);

                const res = await fetch(
                    `https://randal.onepixperday.xyz/api/get-last-result?address=${address}`
                );

                if (!res.ok) throw new Error("fetch failed");

                const json = await res.json();
                setData(json.body.result);

            } catch (err) {
                console.error(err);
                setError("Could not load result");
            } finally {
                setLoading(false);
            }
        };

        fetchResult();
    }, [address]);

    // UI helpers
    const getResultLabel = (r: string) => {
        switch (r) {
            case "exit":
                return { text: "Portal Exit", color: "#36ff88" };
            case "death":
                return { text: "Death", color: "#ff3b3b" };
            case "disconnect":
                return { text: "Disconnect", color: "#ff9b2f" };
            case "exit_free":
                return { text: "Portal Exit (free)", color: "#baf7d2" };
            case "death_free":
                return { text: "Death (free)", color: "#f1a4a4" };
            case "disconnect_free":
                return { text: "Disconnect (free)", color: "#f5c99a" };
            default:
                return { text: r, color: "#749cf3" };
        }
    };

    // LÓGICA DE RECOMPENSA ACTUALIZADA
    const calculateReward = () => {
        
        if (!data) return 0;
        let rewardAmount;
        
        if (data.result === "disconnect_free" || data.result === "exit_free" || data.result === "death_free"){
            rewardAmount = data.pot * 0.002;
            if (rewardAmount > 0) setShowConfetti(true);
            return rewardAmount;
        }

        if (data.result === "disconnect") rewardAmount = (data.pot * 0.9) * 0.002;
        // Caso normal (exit o death): (POT + HP) * 0.002 en death ya mando 10% al matador
        if (data.result === "exit" || data.result === "death") rewardAmount = (data.pot + data.hp) * 0.002;
        if (rewardAmount > 0.25) setShowConfetti(true);
        return rewardAmount;

    };

    const reward = calculateReward();

    const rewardColor =
        reward > 0.25
            ? "#36ff88"
            : reward >= 0.2
                ? "#ff9b2f"
                : "#ff3b3b";

    return (
        <div
            onClick={onClose}
            style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "relative",
                    width: "500px",
                    maxWidth: "95%",
                    background: "#1e1e1e",
                    borderRadius: 14,
                    padding: 24,
                    color: "white",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
                }}
            >
                <h2 className="text-2xl font-bold mb-4" style={{ marginTop: 0 }}>Last Run Result</h2>

                {loading && <p>Loading result...</p>}
                {error && <p style={{ color: "#ff5555" }}>{error}</p>}

                {!loading && !error && data && (
                    <>
                        {/* RESULT STATUS */}
                        <div
                            style={{
                                marginBottom: 18,
                                padding: 14,
                                borderRadius: 10,
                                background: "#111",
                                textAlign: "center",
                                border: `2px solid ${getResultLabel(data.result).color}`
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 22,
                                    fontWeight: 600,
                                    color: getResultLabel(data.result).color
                                }}
                            >
                                {getResultLabel(data.result).text}
                            </div>
                        </div>

                        {/* STATS */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: 12
                            }}
                        >
                            <Stat label="Final Pot" value={data.pot} />
                            <Stat label="Final HP" value={data.hp} />
                            <Stat label="Damage (XP)" value={data.xp} />
                            <Stat label="Kills" value={data.kills} />
                        </div>

                        {/* REWARD */}
                        <div
                            style={{
                                marginTop: 20,
                                padding: 16,
                                borderRadius: 10,
                                background: "#111",
                                textAlign: "center"
                            }}
                        >
                            <div style={{ opacity: 0.7, fontSize: 13 }}>
                                Result
                            </div>

                            <div
                                style={{
                                    fontSize: 26,
                                    fontWeight: 700,
                                    color: rewardColor
                                }}
                            >
                                {reward.toFixed(3)} WLD
                            </div>
                        </div>
                    </>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 20,
                        width: "100%",
                        padding: 10,
                        borderRadius: 8,
                        border: "none",
                        background: "#333",
                        color: "white",
                        cursor: "pointer"
                    }}
                >
                    Close
                </button>
            </div>
            {showConfetti && (
                <Confetti
                    width={dimensions.width}
                    height={dimensions.height}
                    recycle={false} // Para que caiga una vez y se detenga
                    numberOfPieces={300}
                    onConfettiComplete={() => setShowConfetti(false)} // Limpieza automática
                    style={{ position: 'fixed', top: 0, left: 0, zIndex: 10000 }}
                />
            )}
        </div>
        
    );
}

// small reusable stat component
function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div
            style={{
                background: "#111",
                padding: 12,
                borderRadius: 8,
                textAlign: "center"
            }}
        >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
                {label}
            </div>

            <div style={{ fontSize: 18, fontWeight: 600 }}>
                {value}
            </div>
        </div>
    );
}