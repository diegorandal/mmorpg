'use client';

import React, { useEffect, useState } from 'react';

// Tipado para la configuración
type Config = {
    hand: 'left' | 'right';
    sfx: boolean;
    music: boolean;
    vibration: boolean;
};

export default function SectionConfig() {
    // Estado inicial por defecto
    const [config, setConfig] = useState<Config>({
        hand: 'right',
        sfx: true,
        music: true,
        vibration: true
    });

    // Cargar desde localStorage al montar
    useEffect(() => {
        const saved = localStorage.getItem('game_config');
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading config", e);
            }
        }
    }, []);

    // Guardar en localStorage cada vez que cambie la config
    const updateConfig = (newParams: Partial<Config>) => {
        const updated = { ...config, ...newParams };
        setConfig(updated);
        localStorage.setItem('game_config', JSON.stringify(updated));
    };

    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>
            <div style={{ marginBottom: "20px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    Configuration
                </h1>
            </div>

            <div style={{ maxWidth: "340px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "25px" }}>

                {/* CONTROLS */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Controls" />
                    <div style={buttonGroupStyle}>
                        <button
                            onClick={() => updateConfig({ hand: 'left' })}
                            style={getButtonStyle(config.hand === 'left')}
                        >
                            Left Hand
                        </button>
                        <button
                            onClick={() => updateConfig({ hand: 'right' })}
                            style={getButtonStyle(config.hand === 'right')}
                        >
                            Right Hand
                        </button>
                    </div>
                </div>

                {/* SOUND & VIBRATION */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Sound, Music & Vibration" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <div style={rowStyle}>
                            <span style={textStyle}>Sound Effects</span>
                            <div style={{ display: "flex", gap: "8px", width: "160px" }}>
                                <button onClick={() => updateConfig({ sfx: true })} style={getSmallButtonStyle(config.sfx)}>ON</button>
                                <button onClick={() => updateConfig({ sfx: false })} style={getSmallButtonStyle(!config.sfx)}>OFF</button>
                            </div>
                        </div>

                        <div style={rowStyle}>
                            <span style={textStyle}>Music</span>
                            <div style={{ display: "flex", gap: "8px", width: "160px" }}>
                                <button onClick={() => updateConfig({ music: true })} style={getSmallButtonStyle(config.music)}>ON</button>
                                <button onClick={() => updateConfig({ music: false })} style={getSmallButtonStyle(!config.music)}>OFF</button>
                            </div>
                        </div>

                        <div style={rowStyle}>
                            <span style={textStyle}>Vibration</span>
                            <div style={{ display: "flex", gap: "8px", width: "160px" }}>
                                <button onClick={() => updateConfig({ vibration: true })} style={getSmallButtonStyle(config.vibration)}>ON</button>
                                <button onClick={() => updateConfig({ vibration: false })} style={getSmallButtonStyle(!config.vibration)}>OFF</button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}

// --- COMPONENTES AUXILIARES ---

function SectionLabel({ label }: { label: string }) {
    return (
        <span style={{ fontSize: 12, opacity: 0.5, display: "block", textTransform: "uppercase", marginBottom: 12, letterSpacing: "1px" }}>
            {label}
        </span>
    );
}

// --- ESTILOS DINÁMICOS (Consistentes con Vault/Profile) ---

const getButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "14px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    cursor: "pointer",
    transition: "all 0.2s ease",
    border: "4px solid #D1851F",
    background: isActive
        ? "radial-gradient(circle at center, #3a0402 0%, #4F0603 45%, #000000 100%)"
        : "#222",
    color: "white",
    boxShadow: isActive ? "0 0 10px rgba(209, 133, 31, 0.4)" : "none",
});

const getSmallButtonStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    fontSize: "10px",
    fontWeight: "bold",
    cursor: "pointer",
    border: isActive ? "2px solid #D1851F" : "2px solid #333",
    background: isActive ? "#4F0603" : "#111",
    color: isActive ? "white" : "#666",
});

const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    width: "100%"
};

const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    background: "rgba(22, 22, 22, 0.8)",
    borderRadius: "12px",
    border: "1px solid #222"
};

const textStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: "500",
    color: "#e0e0e0"
};