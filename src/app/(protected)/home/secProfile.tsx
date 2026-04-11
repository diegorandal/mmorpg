'use client';

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { ethers } from "ethers";
import { MiniKit } from '@worldcoin/minikit-js';

type PlayerProfile = {wallet: string; username: string; balance: string; xp: number; kills: number; characterid: number;};
type StoreCharacter = { characterid: number; price: string; };
type WalletCharacter = { characterid: number; };

type Props = { 
    profile: PlayerProfile, 
    fetchProfile: () => Promise<void>;
    handleSetActiveTab: (selectTab: string) => void;
}

export default function SectionProfile({ profile, fetchProfile, handleSetActiveTab }: Props) {

    const [walletCharacters, setWalletCharacters] = useState<number[]>([]);
    const [storeCharacters, setStoreCharacters] = useState<StoreCharacter[]>([]);
    const [loading, setLoading] = useState(true);
    const [canBuy, setCanBuy] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [equippedId, setEquippedId] = useState(profile.characterid); // El que tienes puesto
    const [selectedMarketChar, setSelectedMarketChar] = useState<StoreCharacter | null>(null); // El que quieres comprar
    const carouselRef = useRef<HTMLDivElement>(null);

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
                console.error('fcharacters', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCharacters();
    }, [profile.wallet, refreshKey]);

    useEffect(() => {
        
        if (!selectedMarketChar) {
            setCanBuy(false);
            return;
        }

        try {
            const balance = BigInt(profile.balance || "0");
            const price = BigInt(selectedMarketChar.price || "0");
            setCanBuy(balance >= price);
        } catch (error) {
            console.error("Error calculando balance:", error);
            setCanBuy(false);
        }
    }, [profile.balance, selectedMarketChar]);

    useLayoutEffect(() => {
        const timer = setTimeout(scrollToSelected, 150);         // Pequeño delay para asegurar que el DOM se actualizó con el nuevo borde
        return () => clearTimeout(timer);
    }, [equippedId, loading, refreshKey]);

    const handleBuy = async () => {
        
        const id = selectedMarketChar.characterid;
        const price = selectedMarketChar.price;

        try {

            const balanceWLD = BigInt(profile.balance || "0");
            const priceWLD = BigInt(price || "0");

            // VALIDACION LOCAL
            if (balanceWLD < priceWLD) {
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
       
            if (res.ok) {
                // 3. REFRESCAR TODO
                await fetchProfile(); // Actualiza el balance global
                setRefreshKey(prev => prev + 1); // Dispara el useEffect para recargar carruseles
                // 4. LIMPIAR SELECCIÓN
                setEquippedId(id);
                setSelectedMarketChar(null); // Quita la selección del market porque ya lo compraste
            } else {

                console.error('hbuy',data);
                return;

            }


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

    const scrollToSelected = () => {
        const container = carouselRef.current;
        const selectedElement = container?.querySelector('[data-selected="true"]') as HTMLElement;
        if (container && selectedElement) {
            selectedElement.scrollIntoView({behavior: "smooth", block: "nearest", inline: "center"});
        }
    };

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            <div style={{ marginBottom: "20px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    {profile.username}
                </h1>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", maxWidth: "280px", margin: "0 auto 20px" }}>
                <Stat label="Total XP" value={profile.xp} />
                <Stat label="Total Kills" value={profile.kills} />
            </div>

            {loading ? <p style={{ opacity: 0.5 }}>Loading Arsenal...</p> : (
                <>
                    {/* CAROUSEL 1: TUS PERSONAJES */}
                    <div style={{ marginBottom: "20px" }}>
                        <SectionLabel label="Your Characters" />
                        <div ref={carouselRef} style={{
                            ...carouselStyle,
                            justifyContent: (walletCharacters.length < 4) ? "center" : "flex-start"
                        }}>
                            {walletCharacters.map((id) => (
                                <CharacterItem
                                    key={id}
                                    id={id}
                                    data-selected={equippedId === id}
                                    isSelected={equippedId === id}
                                    onClick={() => handleSelectOwned(id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* CAROUSEL 2: MARKET */}
                    <div style={{ marginBottom: "20px" }}>
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
                    <button
                        onClick={handleBuy}
                        disabled={!canBuy}
                        className={`w-72 py-3 mx-auto flex items-center justify-center rounded-xl font-bold text-lg tracking-widest border-4 transition-all duration-200 
                            ${canBuy
                                ? "bg-[radial-gradient(circle_at_center,#3a0402_0%,#4F0603_45%,#000000_100%)] text-white border-[#D1851F] shadow-[0_0_10px_rgba(209,133,31,0.6)] hover:scale-[1.02]"
                                : "bg-[#222] text-red-500 border-red-900 opacity-80 cursor-not-allowed"
                            }`}
                    >
                        {canBuy
                            ? `Buy with 💰 ${ethers.formatUnits(selectedMarketChar?.price || "0", 18)}`
                            : "Insufficient In-game balance"}
                    </button>
                ) : (
                    <button disabled className="w-72 py-3 mx-auto ...">
                        Select to buy
                    </button>
                )}

            </div>
        </section>
    );
}

// --- HELPERS (Sin cambios en lógica, solo consistencia) ---

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.4, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return <span style={{ fontSize: 12, opacity: 0.5, display: "block", textTransform: "uppercase", marginBottom: 12 }}>{label}</span>;
}

function CharacterItem({ id, isSelected, onClick, price, ...props }: { id: number, isSelected: boolean, onClick: () => void, price?: string }) {
    return (
        <div onClick={onClick} style={{ minWidth: 85, cursor: "pointer" }} data-selected={isSelected ? "true" : "false"} {...props} >
            <img
                src={`https://randalrpg.onepixperday.xyz/char${id}.png`}
                style={{
                    width: 85, height: 85, imageRendering: "pixelated", borderRadius: 12, background: "#111",
                    border: isSelected ? "4px solid #d1851f" : "2px solid #222",
                    transition: "border 0.2s ease"
                }}
            />
            {price && <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{ethers.formatUnits(price, 18)} WLD</div>}
        </div>
    );
}

const carouselStyle: React.CSSProperties = {
    display: "flex", gap: 12, overflowX: "auto", padding: "0 20px 10px", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth", scrollPadding: "0 20px"
};

const secondaryButtonStyle: React.CSSProperties = {
    flex: 1, padding: "14px", borderRadius: "12px", background: "#161616", color: "white", fontSize: "12px", border: "1px solid #222", cursor: "pointer"
};