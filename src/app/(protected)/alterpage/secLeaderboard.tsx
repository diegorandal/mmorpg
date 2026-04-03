
interface LeaderboardProps {
    data: any[]; // O el tipo de dato específico de tu API
    loading: boolean;
}

export default function SectionLeaderboard({ data, loading }: LeaderboardProps) {
    return (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <h2>Leaderboard</h2>
            <div style={{ marginTop: "15px", opacity: 0.9 }}>
                {loading ? (
                    <p>Loading ranking...</p>
                ) : data.length > 0 ? (
                    data.map((player, index) => (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "8px 0",
                                borderBottom: "1px solid #444"
                            }}
                        >
                            <span>{index + 1}. {player.username || "Anonymous"}</span>
                            <span style={{ fontWeight: "bold", color: "#ffd700" }}>
                                {player.xp} XP <span style={{ fontSize: "0.8em", color: "#aaa" }}>({player.kills} Kills)</span>
                            </span>
                        </div>
                    ))
                ) : (
                    <p>No data</p>
                )}
            </div>
        </div>
    );
}