'use client';

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { MiniKit } from '@worldcoin/minikit-js';

type PlayerProfile = {wallet: string; username: string; balance: string; xp: number; kills: number; characterid: number;};
type StoreCharacter = { characterid: number; price: string; };
type WalletCharacter = { characterid: number; };

type Props = { 
    profile: PlayerProfile, 
    fetchProfile: () => Promise<void>;
}

export default function SectionProfile({ profile, fetchProfile }: Props) {
    const [walletCharacters, setWalletCharacters] = useState<number[]>([]);
    const [storeCharacters, setStoreCharacters] = useState<StoreCharacter[]>([]);
    const [loading, setLoading] = useState(true);

    // ESTADOS INDEPENDIENTES
    const [equippedId, setEquippedId] = useState(profile.characterid); // El que tienes puesto
    const [selectedMarketChar, setSelectedMarketChar] = useState<StoreCharacter | null>(null); // El que quieres comprar

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
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCharacters();
    }, [profile.wallet]);
    const handleBuy = async () => {
        
        const id = selectedMarketChar.characterid;
        const price = storeCharacters[id].price;
        const balanceWLD = BigInt(profile.balance);

        try {

            const priceWLD = BigInt(price);

            // VALIDACION LOCAL
            if (balanceWLD < priceWLD) {
                console.error('falta teka');
                return;
            }

            const timestamp = new Date().toLocaleString();
            const message = `Buy character ${id} @ ${timestamp}`;
            const { finalPayload } = await MiniKit.commandsAsync.signMessage({ message });

            if (finalPayload.status !== "success") return;

            const res = await fetch(
                "https://randal.onepixperday.xyz/api/buy-character",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        character: id,
                        address: finalPayload.address,
                        signature: finalPayload.signature,
                        message
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                console.error(data);
                return;
            }
        
            await fetchProfile();

            setEquippedId(id);
            profile.characterid = id;


        } catch (err) {
            console.error("buy failed", err);
        }

    }

    const handleSelectOwned = async (id: number) => {
        try {
            const res = await fetch(`https://randal.onepixperday.xyz/api/set-character?address=${profile.wallet}&character=${id}`);
            if (res.ok) {
                setEquippedId(id);
                profile.characterid = id;
            }
        } catch (err) {
            console.error("Failed to set character", err);
        }
    };

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            <div style={{ marginBottom: "32px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    {profile.username}
                </h1>
                <p style={{ fontSize: 10, opacity: 0.4, marginTop: 6, fontFamily: 'monospace' }}>
                    {profile.wallet}
                </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "280px", margin: "0 auto 40px" }}>
                <Stat label="Total XP" value={profile.xp} />
                <Stat label="Total Kills" value={profile.kills} />
            </div>

            {loading ? <p style={{ opacity: 0.5 }}>Loading Arsenal...</p> : (
                <>
                    {/* CAROUSEL 1: TUS PERSONAJES (Independiente) */}
                    <div style={{ marginBottom: "30px" }}>
                        <SectionLabel label="Your Characters" />
                        <div style={{
                            ...carouselStyle,
                            justifyContent: (walletCharacters.length < 4) ? "center" : "flex-start"
                        }}>
                            {walletCharacters.map((id) => (
                                <CharacterItem
                                    key={id}
                                    id={id}
                                    isSelected={equippedId === id} // Basado solo en lo que tienes puesto
                                    onClick={() => handleSelectOwned(id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* CAROUSEL 2: MARKET (Independiente) */}
                    <div style={{ marginBottom: "40px" }}>
                        <SectionLabel label="Market Characters" />
                        <div style={{
                            ...carouselStyle,
                            justifyContent: (storeCharacters.length < 4) ? "center" : "flex-start"
                        }}>
                            {storeCharacters.map((char) => (
                                <CharacterItem
                                    key={char.characterid}
                                    id={char.characterid}
                                    price={char.price}
                                    isSelected={selectedMarketChar?.characterid === char.characterid} // Basado solo en el market
                                    onClick={() => setSelectedMarketChar(char)}
                                />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* BOTONES DE ACCIÓN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>

                {/* Si hay algo en el market seleccionado, el botón es verde y para comprar */}
                {selectedMarketChar ? (
                    <button onClick={handleBuy} style={{ ...mainButtonStyle, background: "#36ff88" }}>
                        Buy Character ({ethers.formatUnits(selectedMarketChar.price, 18)} WLD)
                    </button>
                ) : (
                    /* Si no hay nada en el market, el botón muestra el estado del equipado */
                    <button disabled style={{ ...mainButtonStyle, background: "#333", color: "#888", cursor: "default" }}>
                        Select a Store Character to Buy
                    </button>
                )}

                <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: "300px" }}>
                    <button style={secondaryButtonStyle}>Last Run Result</button>
                    <button style={secondaryButtonStyle}>History</button>
                </div>
            </div>
        </section>
    );
}

// --- HELPERS (Sin cambios en lógica, solo consistencia) ---

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
                    border: isSelected ? "3px solid #facc15" : "2px solid #222",
                    transition: "border 0.2s ease"
                }}
            />
            {price && <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{ethers.formatUnits(price, 18)} WLD</div>}
        </div>
    );
}

const carouselStyle: React.CSSProperties = {
    display: "flex", gap: 12, overflowX: "auto", padding: "0 20px 10px", WebkitOverflowScrolling: "touch"
};

const mainButtonStyle: React.CSSProperties = {
    width: "100%", maxWidth: "300px", padding: "16px", borderRadius: "12px", color: "#000", fontWeight: "800", border: "none", cursor: "pointer", fontSize: "13px"
};

const secondaryButtonStyle: React.CSSProperties = {
    flex: 1, padding: "14px", borderRadius: "12px", background: "#161616", color: "white", fontSize: "12px", border: "1px solid #222", cursor: "pointer"
};