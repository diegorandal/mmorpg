'use client';

import { useEffect, useState } from "react";
import Confetti from 'react-confetti';
import { ethers } from "ethers";

type PlayerProfile = { wallet: string; username: string; balance: string; xp: number; kills: number; characterid: number; };

type Props = { address: string; profile: PlayerProfile };

type ResultResponse = {
    result: "exit" | "death" | "disconnect" | "exit_free" | "death_free" | "disconnect_free";
    pot: number;
    hp: number;
    kills: number;
    xp: number;
};

export default function SectionResult({ address, profile }: Props) {
    const [loading, setLoading] = useState(true);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
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
                console.error('getlastr', err);
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

    const handleFeedback = async () => {
        if (!data || !address) return;

        setFeedbackLoading(true);
        try {
            const response = await fetch('/api/get-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletAddress: profile.wallet,
                    stats: {
                        username: profile.username,
                        balance: ethers.formatUnits(profile.balance, 18), 
                        xp: profile.xp,
                        kills: profile.kills,
                    }
                }),
            });

            const resData = await response.json();
            if (resData.url) {
                window.location.href = resData.url;
            }
        } catch (err) {
            console.error("Error al obtener link de feedback", err);
        } finally {
            setFeedbackLoading(false);
        }
    };

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
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>
            {showConfetti && (
                <Confetti
                    width={dimensions.width}
                    height={dimensions.height}
                    recycle={true}
                    gravity={0.4}
                    initialVelocityX={{ min: -15, max: 15 }}
                    initialVelocityY={{ min: -25, max: 25 }}
                    numberOfPieces={300}
                    onConfettiComplete={() => setShowConfetti(false)}
                    style={{ position: 'fixed', top: 0, left: 0, zIndex: 10001, pointerEvents: 'none' }}
                />
            )}

            <span className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold truncate">
                Last Run Result
            </span>

            {loading && <p className="opacity-50">Loading result...</p>}
            {error && <p style={{ color: "#ff5555" }}>{error}</p>}

            {!loading && !error && data && (
                <div style={{ display: "flex", flexDirection: "column", gap: "40px", alignItems: "center" }}>

                    <div>
                        <span style={{ fontSize: 14, opacity: 0.6, display: "block", textTransform: "uppercase", marginBottom: 2 }}>Status</span>
                        <div style={{ fontSize: 20, fontWeight: 800, color: getResultLabel(data.result).color }}>
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

                    {/* BOTÓN DE FEEDBACK */}
                    <div style={{ marginTop: "20px" }}>
                        <button
                            onClick={handleFeedback}
                            disabled={feedbackLoading}
                            style={{
                                padding: "12px 24px",
                                borderRadius: "12px",
                                border: "1px solid rgba(255,255,255,0.2)",
                                background: feedbackLoading ? "rgba(255, 255, 255, 0)" : "rgba(255,255,255,0.1)",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "16px",
                                cursor: feedbackLoading ? "not-allowed" : "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {feedbackLoading ? "Loading..." : "Feedback"}
                        </button>
                    </div>

                </div>
            )}
        </section>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.4, marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>
    );
}