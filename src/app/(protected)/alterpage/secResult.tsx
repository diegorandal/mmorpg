'use client';

import { useEffect, useState } from "react";
import Confetti from 'react-confetti';

type Props = { address: string; };

type ResultResponse = {
    result: "exit" | "death" | "disconnect" | "exit_free" | "death_free" | "disconnect_free";
    pot: number;
    hp: number;
    kills: number;
    xp: number;
};

export default function SectionResult({ address }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [data, setData] = useState<ResultResponse | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

    useEffect(() => {
        const fetchResult = async () => {
            try {
                setLoading(true);
                const res = await fetch(`https://randal.onepixperday.xyz/api/get-last-result?address=${address}`);
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

    const getResultLabel = (r: string) => {
        switch (r) {
            case "exit": return { text: "Portal Exit", color: "#36ff88" };
            case "death": return { text: "Death", color: "#ff3b3b" };
            case "disconnect": return { text: "Disconnect", color: "#ff9b2f" };
            case "exit_free": return { text: "Portal Exit (free)", color: "#baf7d2" };
            case "death_free": return { text: "Death (free)", color: "#f1a4a4" };
            case "disconnect_free": return { text: "Disconnect (free)", color: "#f5c99a" };
            default: return { text: r, color: "#749cf3" };
        }
    };

    const calculateReward = () => {
        if (!data) return 0;
        let rewardAmount = 0;
        if (data.result === "exit_free" || data.result === "death") {
            rewardAmount = data.pot;
        } else if (data.result === "disconnect") {
            rewardAmount = data.pot * 0.9;
        } else if (data.result === "exit") {
            rewardAmount = (data.pot + (data.hp * 2000));
        }
        return rewardAmount / 1000000;
    };

    const reward = calculateReward();

    useEffect(() => {
        if (data) {
            const currentReward = calculateReward();
            const isFree = data.result.includes("_free");
            if ((isFree && currentReward > 0) || currentReward > 0.25) {
                setShowConfetti(true);
            }
        }
    }, [data]);

    const rewardColor = showConfetti ? "#36ff88" : reward > 0 ? "#ff9b2f" : "#ff3b3b";

    return (
        <section style={{ width: "100%", color: "white", padding: "40px 0", textAlign: "center" }}>
            {showConfetti && (
                <Confetti
                    width={dimensions.width}
                    height={dimensions.height}
                    recycle={false}
                    numberOfPieces={300}
                    onConfettiComplete={() => setShowConfetti(false)}
                    style={{ position: 'fixed', top: 0, left: 0, zIndex: 10001, pointerEvents: 'none' }}
                />
            )}

            <h2 className="text-3xl font-bold mb-8">Last Run Result</h2>

            {loading && <p className="opacity-50">Loading result...</p>}
            {error && <p style={{ color: "#ff5555" }}>{error}</p>}

            {!loading && !error && data && (
                <div style={{ display: "flex", flexDirection: "column", gap: "40px", alignItems: "center" }}>

                    <div>
                        <span style={{ fontSize: 14, opacity: 0.6, display: "block", textTransform: "uppercase", marginBottom: 4 }}>Status</span>
                        <div style={{ fontSize: 36, fontWeight: 800, color: getResultLabel(data.result).color }}>
                            {getResultLabel(data.result).text}
                        </div>
                    </div>

                    {/* STATS GRID (Centrado) */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "24px",
                        width: "100%",
                        maxWidth: "400px"
                    }}>
                        <Stat label="Final Pot" value={(Number(data.pot) / 1000000)} />
                        <Stat label="Final HP" value={data.hp} />
                        <Stat label="Damage (XP)" value={data.xp} />
                        <Stat label="Kills" value={data.kills} />
                    </div>

                    {/* TOTAL REWARD (Centrado) */}
                    <div>
                        <div style={{ opacity: 0.6, fontSize: 14, marginBottom: 8, textTransform: "uppercase" }}>Total Earned</div>
                        <div style={{ fontSize: 48, fontWeight: 900, color: rewardColor, letterSpacing: "-1px" }}>
                            {reward.toFixed(6)} <span style={{ fontSize: 24 }}>WLD</span>
                        </div>
                    </div>

                </div>
            )}
        </section>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
        </div>
    );
}