'use client';

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { MiniKit } from '@worldcoin/minikit-js';

type StoreCharacter = {
    characterid: number;
    price: string;
};

type WalletCharacter = {
    characterid: number;
};

type Props = {
    address: string;
    balance: number; 
    onSelect: (characterId: number, refetechar?: boolean) => void;
    onClose: () => void;
};

export default function CharactersModal({address, balance, onSelect, onClose}: Props) {

    const [walletCharacters, setWalletCharacters] = useState<number[]>([]);
    const [storeCharacters, setStoreCharacters] = useState<StoreCharacter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [buyError, setBuyError] = useState("");

    // ESC close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // FETCH CHARACTERS
    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                setLoading(true);

                const res = await fetch(
                    `https://randal.onepixperday.xyz/api/get-characters?address=${address}`
                );

                if (!res.ok) throw new Error("fetch failed");

                const data = await res.json();

                const owned: WalletCharacter[] =
                    data.body.wallet_characters ?? [];

                const store: StoreCharacter[] =
                    data.body.characters_store ?? [];

                const ownedIds = owned.map(c => c.characterid);

                setWalletCharacters(ownedIds);

                // filtrar los que ya tiene
                setStoreCharacters(
                    store.filter(c => !ownedIds.includes(c.characterid))
                );

            } catch (err) {
                console.error(err);
                setError("Could not load characters");
            } finally {
                setLoading(false);
            }
        };

        fetchCharacters();
    }, [address]);

    // UI helpers
    const renderCharacter = (
        id: number,
        selectable: boolean,
        price?: string
    ) => (
        <div
            key={id}
            onClick={async () => {
                if (selectable) {
                    try {
                        const res = await fetch(`https://randal.onepixperday.xyz/api/set-character?address=${address}&character=${id}`);
                        const data = await res.json();
                        if (!res.ok) {console.error(data); return;}
                        // seleccionar localmente
                        onSelect(id);
                        // cerrar modal
                        onClose();
                    } catch (err) {
                        console.error("set character failed", err);
                    }
                } else {

 
                    try {

                        const priceWLD = Number(ethers.formatUnits(price!, 18));

                        // VALIDACION LOCAL
                        if (balance < priceWLD) {
                            setBuyError("Insufficient balance");
                            setTimeout(() => setBuyError(""), 2500);
                            return;
                        }
                        const timestamp = new Date().toLocaleString();
                        const message = `Buy character ${id} @ ${timestamp}`;

                        const { finalPayload } =
                            await MiniKit.commandsAsync.signMessage({ message });

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

                        onSelect(id, true);
                        onClose();

                    } catch (err) {
                        console.error("buy failed", err);
                    }


                }
            }}
            style={{
                minWidth: 96,
                cursor: "pointer",
                textAlign: "center"
            }}
        >
            <img
                src={`https://randalrpg.onepixperday.xyz/char${id}.png`}
                style={{
                    width: 96,
                    height: 96,
                    imageRendering: "pixelated",
                    borderRadius: 8,
                    background: "#111",
                    border: selectable
                        ? "2px solid #555"
                        : "2px solid #333"
                }}
            />

            {!selectable && price && (
                <p style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    {ethers.formatUnits(price, 18)} WLD
                </p>
            )}
        </div>
    );

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
                    width: "600px",
                    maxWidth: "95%",
                    background: "#1e1e1e",
                    borderRadius: 14,
                    padding: 24,
                    color: "white",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
                }}
            >

                <div
                    style={{
                        position: "absolute",
                        top: 16,
                        right: 20,
                        fontSize: 13,
                        opacity: 0.85
                    }}
                >
                    Balance: {balance} WLD
                </div>

                <h2 className="text-2xl font-bold mb-4" style={{ marginTop: 0 }}>Character</h2>
                {buyError && (
                    <div
                        style={{
                            color: "#ff2828",
                            padding: "8px 12px",
                            borderRadius: 6,
                            marginBottom: 10,
                            fontSize: 13
                        }}
                    >
                        {buyError}
                    </div>
                )}
                {loading && <p>Loading characters...</p>}
                {error && <p style={{ color: "#ff5555" }}>{error}</p>}

                {!loading && !error && (
                    <>
                        {/* OWNED */}
                        <h3 style={{ marginBottom: 8 }}>Your Characters</h3>

                        <div
                            style={{
                                display: "flex",
                                gap: 14,
                                overflowX: "auto",
                                paddingBottom: 10
                            }}
                        >
                            {walletCharacters.map(id =>
                                renderCharacter(id, true)
                            )}
                        </div>

                        {/* STORE */}
                        <h3 style={{ marginTop: 20, marginBottom: 8 }}>
                            Store
                        </h3>

                        <div
                            style={{
                                display: "flex",
                                gap: 14,
                                overflowX: "auto",
                                paddingBottom: 10
                            }}
                        >
                            {storeCharacters.map(c =>
                                renderCharacter(
                                    c.characterid,
                                    false,
                                    c.price
                                )
                            )}
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
        </div>
    );
}