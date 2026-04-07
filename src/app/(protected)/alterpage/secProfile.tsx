'use client';

import { useEffect, useState } from "react";
import { ethers } from "ethers";

type PlayerProfile = {
    wallet: string;
    username: string;
    balance: string;
    xp: number;
    kills: number;
    characterid: number;
};

type StoreCharacter = { characterid: number; price: string; };
type WalletCharacter = { characterid: number; };

type Props = { profile: PlayerProfile; };

export default function SectionProfile({ profile }: Props) {
    const [walletCharacters, setWalletCharacters] = useState<number[]>([]);
    const [storeCharacters, setStoreCharacters] = useState<StoreCharacter[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMarketChar, setSelectedMarketChar] = useState<StoreCharacter | null>(null);
    const [currentCharacterId, setCurrentCharacterId] = useState(profile.characterid);

    // FETCH REAL DE DATOS
    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                setLoading(true);
                const res = await fetch(`https://randal.onepixperday.xyz/api/get-characters?address=${profile.wallet}`);
                if (!res.ok) throw new Error("fetch failed");

                const data = await res.json();
                const owned: WalletCharacter[] = data.body.wallet_characters ?? [];
                const store: StoreCharacter[] = data.body.characters_store ?? [];
                const ownedIds = owned.map(c => c.characterid);

                setWalletCharacters(ownedIds);
                setStoreCharacters(store.filter(c => !ownedIds.includes(c.characterid)));
            } catch (err) {
                console.error("Error loading characters:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCharacters();
    }, [profile.wallet]);

    // Handlers
    const handleSelectOwned = async (id: number) => {
        setSelectedMarketChar(null);
        try {
            const res = await fetch(`https://randal.onepixperday.xyz/api/set-character?address=${profile.wallet}&character=${id}`);
            if (res.ok) setCurrentCharacterId(id);
        } catch (err) {
            console.error("Failed to set character", err);
        }
    };

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            {/* CABECERA */}
            <div style={{ marginBottom: "32px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    {profile.username}
                </h1>
                <p style={{ fontSize: 11, opacity: 0.4, marginTop: 6, fontFamily: 'monospace' }}>
                    {profile.wallet}
                </p>
            </div>

            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "280px", margin: "0 auto 40px" }}>
                <Stat label="Total XP" value={profile.xp} />
                <Stat label="Total Kills" value={profile.kills} />
            </div>

            {loading ? <p style={{ opacity: 0.5 }}>Loading Arsenal...</p> : (
                <>
                    {/* YOUR CHARACTERS */}
                    <div style={{ marginBottom: "30px" }}>
                        <SectionLabel label="Your Characters" />
                        <div style={carouselStyle}>
                            {walletCharacters.map((id) => (
                                <CharacterItem
                                    key={id}
                                    id={id}
                                    isSelected={currentCharacterId === id && !selectedMarketChar}
                                    onClick={() => handleSelectOwned(id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* MARKET CHARACTERS */}
                    <div style={{ marginBottom: "40px" }}>
                        <SectionLabel label="Market Characters" />
                        <div style={carouselStyle}>
                            {storeCharacters.map((char) => (
                                <CharacterItem
                                    key={char.characterid}
                                    id={char.characterid}
                                    price={char.price}
                                    isSelected={selectedMarketChar?.characterid === char.characterid}
                                    onClick={() => setSelectedMarketChar(char)}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ACCIONES */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <button style={{
                    ...mainButtonStyle,
                    background: selectedMarketChar ? "#36ff88" : "#facc15",
                }}>
                    {selectedMarketChar
                        ? `Buy Character (${ethers.formatUnits(selectedMarketChar.price, 18)} WLD)`
                        : "Select a Character"}
                </button>

                <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: "300px" }}>
                    <button style={secondaryButtonStyle}>Last Run</button>
                    <button style={secondaryButtonStyle}>History</button>
                </div>
            </div>
        </section>
    );
}

// --- COMPONENTES AUXILIARES ---

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, opacity: 0.5, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return <span style={{ fontSize: 10, opacity: 0.5, display: "block", textTransform: "uppercase", marginBottom: 12 }}>{label}</span>;
}

function CharacterItem({ id, isSelected, onClick, price }: { id: number, isSelected: boolean, onClick: () => void, price?: string }) {
    return (
        <div onClick={onClick} style={{ minWidth: 85, cursor: "pointer" }}>
            <img
                src={`https://randalrpg.onepixperday.xyz/char${id}.png`}
                style={{
                    width: 85, height: 85, imageRendering: "pixelated", borderRadius: 12, background: "#111",
                    border: isSelected ? "3px solid #facc15" : "2px solid #222"
                }}
            />
            {price && <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{ethers.formatUnits(price, 18)} WLD</div>}
        </div>
    );
}

// --- ESTILOS ---
const carouselStyle: React.CSSProperties = {
    display: "flex", gap: 12, overflowX: "auto", justifyContent: "center", padding: "0 20px 10px"
};

const mainButtonStyle: React.CSSProperties = {
    width: "100%", maxWidth: "300px", padding: "16px", borderRadius: "12px", color: "#000", fontWeight: "800", border: "none", cursor: "pointer"
};

const secondaryButtonStyle: React.CSSProperties = {
    flex: 1, padding: "14px", borderRadius: "12px", background: "#161616", color: "white", fontSize: "12px", border: "1px solid #222", cursor: "pointer"
};