'use client';

import { useEffect } from "react";

// 1. Centralizamos toda la información aquí
const ROOM_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
    pay: {
        title: "PVP Server",
        description: `
            <p>• Enter using the PLAY button (pay 0.25 wld).</p>
            <p>• 0.20 wld to 100 HP, 0.05 wld to game fee.</p>
            <p>• Defeat enemys. 10% (enemy POT) bonus for final hit.</p>
            <p>• 1 HP = 1 POT = 0.002 wld.(0.2 wld for each enemy defeated)</p>
            <p>• You receive 100% of the POT (+HP) if you exit through a yellow portal.</p>
            <p>• You receive 90% of the POT if you die or disconnect.</p>
        `
    },
    free: {
        title: "Free Server",
        description: `
            <p>• Enter using the FREE button (no pay).</p>
            <p>• Find and defeat the red wizard "Carandir", get 1 POT.</p>
            <p>• Reach a yellow portal to save your POT.</p>
            <p>• If someone else kills you, they keep your POT.</p>
            <p>• Carandir will respawn after 3 minutes.</p>
        `
    },
};

type Props = {
    selector: string | null; // El ID de la sala (ej: 'lobby', 'bosque')
    onClose: () => void;
};

export default function InfoModal({ selector, onClose }: Props) {

    // ESC close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // Si no hay selector o el ID no existe en nuestro diccionario, no mostramos nada
    if (!selector || !ROOM_DESCRIPTIONS[selector]) return null;

    const { title, description } = ROOM_DESCRIPTIONS[selector];

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
                zIndex: 10000
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: "relative",
                    width: "420px",
                    maxWidth: "90%",
                    background: "#1e1e1e",
                    borderRadius: 16,
                    padding: 28,
                    color: "white",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    border: "1px solid #333"
                }}
            >
                <h2 style={{ fontSize: 22, fontWeight: "800", marginBottom: 16, marginTop: 0 }}>
                    {title}
                </h2>

                <div
                    style={{
                        opacity: 0.9,
                        lineHeight: "1.6",
                        fontSize: 15,
                        marginBottom: 24,
                        color: "#ddd"
                    }}
                    dangerouslySetInnerHTML={{ __html: description }}
                />

                <button
                    onClick={onClose}
                    style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        border: "none",
                        background: "#333",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: 14
                    }}
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}