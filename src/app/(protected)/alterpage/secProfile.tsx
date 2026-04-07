'use client';

type PlayerProfile = {
    wallet: string;
    username: string;
    balance: string;
    xp: number;
    kills: number;
    characterid: number;
    characters: number[];
};

type Props = { profile: PlayerProfile; };

export default function SectionProfile({ profile }: Props) {

    // Función para manejar la selección (lógica vacía por ahora)
    const handleSelectCharacter = (id: number) => {
        console.log("Selected character:", id);
    };

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            {/* USERNAME & WALLET */}
            <div style={{ marginBottom: "32px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    {profile.username}
                </h1>
                <p style={{ fontSize: 12, opacity: 0.5, marginTop: 4, fontFamily: 'monospace' }}>
                    {profile.wallet}
                </p>
            </div>

            {/* XP | KILLS (Formato Stat consistente) */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "24px",
                width: "100%",
                maxWidth: "300px",
                margin: "0 auto 40px auto"
            }}>
                <Stat label="Total XP" value={profile.xp} />
                <Stat label="Total Kills" value={profile.kills} />
            </div>

            {/* CAROUSEL SELECTION */}
            <div style={{ marginBottom: "40px" }}>
                <span style={{ fontSize: 12, opacity: 0.5, display: "block", textTransform: "uppercase", marginBottom: 12 }}>
                    Your Characters
                </span>
                <div style={{
                    display: "flex",
                    gap: 16,
                    overflowX: "auto",
                    justifyContent: profile.characters.length > 3 ? "flex-start" : "center",
                    padding: "10px 20px",
                    WebkitOverflowScrolling: "touch"
                }}>
                    {profile.characters.map((id) => (
                        <div
                            key={id}
                            onClick={() => handleSelectCharacter(id)}
                            style={{
                                minWidth: 96,
                                cursor: "pointer",
                                transition: "transform 0.2s"
                            }}
                        >
                            <img
                                src={`https://randalrpg.onepixperday.xyz/char${id}.png`}
                                alt={`Char ${id}`}
                                style={{
                                    width: 96,
                                    height: 96,
                                    imageRendering: "pixelated",
                                    borderRadius: 12,
                                    background: "#111",
                                    border: profile.characterid === id ? "3px solid #facc15" : "2px solid #333",
                                    boxShadow: profile.characterid === id ? "0 0 15px rgba(250, 204, 21, 0.3)" : "none"
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>

                <button style={{
                    width: "100%",
                    maxWidth: "280px",
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#facc15",
                    color: "#000",
                    fontWeight: "bold",
                    border: "none",
                    cursor: "pointer"
                }}>
                    Buy New Character
                </button>

                <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: "280px" }}>
                    <button style={secondaryButtonStyle}>
                        Last Run
                    </button>
                    <button style={secondaryButtonStyle}>
                        History
                    </button>
                </div>

            </div>
        </section>
    );
}

// Sub-componente Stat consistente
function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 2, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

// Estilo para botones secundarios
const secondaryButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "12px",
    borderRadius: "10px",
    background: "#222",
    color: "white",
    fontSize: "13px",
    border: "1px solid #333",
    cursor: "pointer"
};