'use client';

import React from 'react';

// Reutilizamos el componente de etiqueta que usas en Vault y Profile
function SectionLabel({ label }: { label: string }) {
    return (
        <span style={{
            fontSize: 12,
            opacity: 0.5,
            display: "block",
            textTransform: "uppercase",
            marginBottom: 12,
            letterSpacing: "1px"
        }}>
            {label}
        </span>
    );
}

export default function SectionInformation() {
    return (
        <section style={{ width: "100%", color: "white", padding: "20px 0", textAlign: "center" }}>

            {/* TÍTULO PRINCIPAL - Estilo similar al nombre de usuario en Profile */}
            <div style={{ marginBottom: "20px" }}>
                <h1 className="text-4xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold">
                    Information
                </h1>
            </div>

            <div style={{ maxWidth: "340px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "25px" }}>

                {/* SUBSECCIÓN: ABOUT GAME */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="About Game" />
                    <div style={infoBoxStyle}>
                        <div style={textContentStyle}>
                            <p>
                                sKillsTake is a high-stakes Action RPG featuring a persistent extraction map where player skill directly dictates financial rewards. Moving away from traditional Play-to-Earn models, it introduces a sustainable Skill-to-Earn.
                            </p>

                            {/* Salto de línea antes y después usando márgenes o br */}
                            <p style={{ margin: "10px 0", fontWeight: "bold", color: "#D1851F" }}>
                                Key Features
                            </p>

                            <ul style={{ ...textContentStyle, paddingLeft: "15px", listStyleType: "circle" }}>
                                <li style={{ marginBottom: "8px" }}>
                                    <strong style={{ color: "#fff" }}>Skill-Based Economy:</strong> A zero-sum ecosystem where value is transferred through combat. Players extract digital assets (WLD) from opponents by dealing damage, effectively turning high-performing players into natural "bounties" with growing visual auras.
                                </li>
                                <li style={{ marginBottom: "8px" }}>
                                    <strong style={{ color: "#fff" }}>High-Stakes Extraction:</strong> Players enter the map with a buy-in that converts to health (HP). Success depends on navigating variable extraction portals to secure accumulated gains and remaining health.
                                </li>
                                <li style={{ marginBottom: "8px" }}>
                                    <strong style={{ color: "#fff" }}>Level Playing Field:</strong> To eliminate "Pay-to-Win" mechanics, all characters feature identical base stats, including damage, speed, and equipment, ensuring that only mechanical skill determines the victor.
                                </li>
                                <li style={{ marginBottom: "8px" }}>
                                    <strong style={{ color: "#fff" }}>Dynamic Survival:</strong> A strategic risk-management system allows players to use their earnings to heal during combat, balancing the protection of their "Pot" against the necessity of survival.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* SUBSECCIÓN: ECONOMY */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Economy" />
                    <div style={infoBoxStyle}>
                        <p style={textContentStyle}>
                            1 in-game 💰 = 1 WLD. 
                        </p>
                    </div>
                </div>

                {/* SUBSECCIÓN: HOW TO PLAY */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="How to play" />
                    <div style={infoBoxStyle}>
                        <ul style={{ ...textContentStyle, paddingLeft: "15px", listStyleType: "circle" }}>
                            <li style={{ marginBottom: "8px" }}>Rooms: [Coming soon]</li>
                            <li style={{ marginBottom: "8px" }}>Controls: [Coming soon]</li>
                            <li style={{ marginBottom: "8px" }}>Pot: [Coming soon]</li>
                            <li style={{ marginBottom: "8px" }}>Portals: [Coming soon]</li>
                        </ul>
                    </div>
                </div>

            </div>
        </section>
    );
}

// --- ESTILOS CONSISTENTES CON EL DISEÑO ACTUAL ---

const infoBoxStyle: React.CSSProperties = {
    width: "100%",
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(22, 22, 22, 0.8)", // Fondo oscuro como el de las tablas/botones
    border: "1px solid #222",
    boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)"
};

const textContentStyle: React.CSSProperties = {
    fontSize: "13px",
    lineHeight: "1.6",
    color: "#e0e0e0",
    margin: 0,
    opacity: 0.9,
    fontFamily: "sans-serif"
};