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

const controlData = [
    { imgUrl: "https://randalrpg.onepixperday.xyz/joystick.png", function: "Move the joystick to move the character." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/button_run.png", function: "20% more speed, but you can't attack." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/button_sword.png", function: "Sword attacks." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/button_bow.png", function: "Bow attacks." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/button_wand.png", function: "Wand attacks." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/button_spell.png", function: "Spell attacks." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/attacks1.png", function: "Choose one of the attacks or defend. Defending stops 1 attack." },
    { imgUrl: "https://randalrpg.onepixperday.xyz/button_potion.png", function: "Use the potion to increase your life points by paying with your earnings. (10 HP = 💰 0.002)" },
    { imgUrl: "https://randalrpg.onepixperday.xyz/drop_flag.png", function: "Drop the flag." },
];

const attackData = [
    {
        name: "Sword 1",
        description: "Basic frontal attack based on the character's direction.",
        stats: { Damage: "5", Hitbox: "Circular", Cooldown: "250ms", Targets: "Multiple", Range: "32", Radius: "32" }
    },
    {
        name: "Sword 2",
        description: "Thrust to the front.",
        stats: { Damage: "10", Hitbox: "Rectangular", Cooldown: "500ms", Targets: "Multiple", Range: "60", Width: "24" }
    },
    {
        name: "Sword 3",
        description: "Circular area attack centered on the player. The closer you are, the more damage it does.",
        stats: { Damage: "0 to 10", Hitbox: "Circular", Cooldown: "600ms", Targets: "Multiple", Range: "0 to 25", Radius: "50" }
    },
    {
        name: "Bow 1",
        description: "Straight shot. Hits the nearest enemy within the trajectory.",
        stats: { Damage: "6", Hitbox: "Linear", Cooldown: "350ms", Targets: "1", Range: "300", Radius: "20" }
    },
    {
        name: "Bow 2",
        description: "Aimed shot. Requires clicking on the target.",
        stats: { Damage: "6", Hitbox: "Target", Cooldown: "750ms", Targets: "1", Range: "300" }
    },
    {
        name: "Bow 3",
        description: "Area arrow that hits the target and nearby enemies.",
        stats: { Damage: "4", Hitbox: "Circular", Cooldown: "900ms", Targets: "Multiple", Range: "300", Radius: "75" }
    },
    {
        name: "Wand 1",
        description: "Medium-range frontal magic blast.",
        stats: { Damage: "3", Hitbox: "Circular", Cooldown: "450ms", Targets: "Multiple", Range: "64", Radius: "80" }
    },
    {
        name: "Wand 2",
        description: "Direct fireball. Requires clicking on the target.",
        stats: { Damage: "5", Hitbox: "Target", Cooldown: "500ms", Targets: "1", Range: "300" }
    },
    {
        name: "Wand 3",
        description: "Automatically seeks out and attacks the nearest enemy.",
        stats: { Damage: "4", Hitbox: "Target", Cooldown: "900ms", Targets: "1", Range: "300" }
    },
    {
        name: "Spell 1",
        description: "Mid-range blast centered on the player.",
        stats: { Damage: "4", Hitbox: "Circular", Cooldown: "700ms", Targets: "Multiple", Range: "0", Radius: "100" }
    },
    {
        name: "Spell 2",
        description: "Spell directed at a selected target. No re-targeting required.",
        stats: { Damage: "3", Hitbox: "Target", Cooldown: "600ms", Targets: "1", Range: "300" }
    },
    {
        name: "Spell 3",
        description: "Electric shocks surround the player.",
        stats: { Damage: "2", Hitbox: "Circular", Cooldown: "900ms", Targets: "Multiple", Range: "500" }
    },

];

function PolygonPortal({ color }: { color: string }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let anguloRotacion = 0;
        const lados = 7;
        const radio = 12; 
        const centroX = 16;
        const centroY = 16;

        const dibujar = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(centroX, centroY);
            ctx.rotate(anguloRotacion);

            ctx.beginPath();
            for (let i = 0; i < lados; i++) {
                const x = radio * Math.cos((2 * Math.PI * i) / lados);
                const y = radio * Math.sin((2 * Math.PI * i) / lados);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5; // Esto aplica el 50% de transparencia
            ctx.fill();
            ctx.globalAlpha = 1.0;  // Restauramos la opacidad al 100% para la línea
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            anguloRotacion += 0.03;
            animationFrameId = requestAnimationFrame(dibujar);
        };

        dibujar();
        return () => cancelAnimationFrame(animationFrameId);
    }, [color]);

    return (
        <canvas
            ref={canvasRef}
            width={32}
            height={32}
            style={{ verticalAlign: 'middle', marginRight: '8px' }}
        />
    );
}

function MapNodesComponent({ color1, color2 }: { color1: string, color2: string }) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    // Coordenadas originales del mapa 4800x4800
    const rawPositions = [
        { x: 667, y: 3916 },
        { x: 2845, y: 3587 },
        { x: 4298, y: 4412 },
        { x: 4460, y: 2863 },
        { x: 4254, y: 1174 },
        { x: 763, y: 775 },
        { x: 1854, y: 2032 }
    ];

    // Escalar las posiciones al tamaño del canvas (64px)
    const scaledPositions = rawPositions.map(p => ({
        x: (p.x * 64) / 4800,
        y: (p.y * 64) / 4800
    }));

    const [assignedNodes, setAssignedNodes] = React.useState<any>(null);

    const shuffleNodes = () => {
        // Mezclamos el array de posiciones escaladas
        const shuffled = [...scaledPositions].sort(() => Math.random() - 0.5);
        setAssignedNodes({
            group1: shuffled.slice(0, 3), // Los primeros 3 para color1
            group2: shuffled.slice(3, 7)  // Los siguientes 4 para color2
        });
    };

    React.useEffect(() => {
        shuffleNodes();
        const interval = setInterval(shuffleNodes, 3000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !assignedNodes) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawCircle = (p: any, color: string) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        };

        const drawLine = (p1: any, p2: any, color: string) => {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
        };

        ctx.clearRect(0, 0, 64, 64);

        // Grupo 1: 3 nodos conectados en ciclo
        const g1 = assignedNodes.group1;
        drawLine(g1[0], g1[1], color1);
        drawLine(g1[1], g1[2], color1);
        drawLine(g1[2], g1[0], color1);
        g1.forEach((p: any) => drawCircle(p, color1));

        // Grupo 2: 4 nodos en 2 parejas
        const g2 = assignedNodes.group2;
        drawLine(g2[0], g2[1], color2);
        drawLine(g2[2], g2[3], color2);
        g2.forEach((p: any) => drawCircle(p, color2));

    }, [assignedNodes, color1, color2]);

    return (
        <canvas
            ref={canvasRef}
            width={64}
            height={64}
            style={{ display: 'block', background: 'transparent' }}
        />
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
                            in-game 💰 1 = 1 WLD. 
                        </p>
                        <p style={textContentStyle}>
                            Depositing and withdrawing are fee free.
                        </p>
                    </div>
                </div>

                {/* SUBSECCIÓN: ROOMS */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Rooms" />
                    <div style={infoBoxStyle}>
                        <ul style={{ ...textContentStyle, paddingLeft: "15px", listStyleType: "circle" }}>
                            <li style={{ marginBottom: "8px" }}><strong style={{ color: "#fff" }}>STAKE FOREST:</strong> Pay the entry fee. Win by attacking other characters. Exit through a yellow portal to keep your winnings.</li>
                            <li style={{ marginBottom: "8px" }}><strong style={{ color: "#fff" }}>TRAINING FOREST:</strong> No entry fee. Find the red wizard and profit by attacking him. Use the yellow portal to exit and keep your winnings.</li>
                            <li style={{ marginBottom: "8px" }}><strong style={{ color: "#fff" }}>FLAG:</strong> Carry the flag and earn profits every second. Use the yellow portal to exit and keep your winnings.</li>
                        </ul>
                    </div>
                </div>

                {/* SUBSECCIÓN: CONTROLS */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Controls" />
                    <div style={infoBoxStyle}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #333", opacity: 0.6 }}>
                                    <th style={{ padding: "8px", textAlign: "center", fontWeight: "normal", fontSize: "11px" }}>BUTTON</th>
                                    <th style={{ padding: "8px", textAlign: "left", fontWeight: "normal", fontSize: "11px" }}>FUNCTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {controlData.map((ctrl, index) => (
                                    <tr key={index} style={{ borderBottom: index !== controlData.length - 1 ? "1px solid #222" : "none" }}>
                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                            <img
                                                src={ctrl.imgUrl}
                                                alt={ctrl.function}
                                                style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "4px" }}
                                            />
                                        </td>
                                        <td style={{ padding: "10px", color: "#e0e0e0", verticalAlign: "middle" }}>
                                            {ctrl.function}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SUBSECCIÓN: ATTACKS */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Attacks & Skills" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {attackData.map((attack, index) => (
                            <div key={index} style={infoBoxStyle}>
                                <div style={{ fontWeight: "bold", color: "#D1851F", marginBottom: "4px", fontSize: "14px" }}>
                                    {attack.name}
                                </div>
                                <p style={{ ...textContentStyle, marginBottom: "8px", fontStyle: "italic", opacity: 0.7 }}>
                                    {attack.description}
                                </p>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "4px",
                                    borderTop: "1px solid #333",
                                    paddingTop: "8px"
                                }}>
                                    {Object.entries(attack.stats).map(([key, value]) => (
                                        <div key={key} style={{ fontSize: "11px" }}>
                                            <span style={{ color: "#888", marginRight: "4px" }}>{key}:</span>
                                            <span style={{ color: "#fff" }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SUBSECCIÓN: PORTALS */}
                <div style={{ textAlign: "left" }}>
                    <SectionLabel label="Portals" />
                    <div style={infoBoxStyle}>
                        <p style={{ margin: "10px 0", fontWeight: "bold", color: "#D1851F" }}>
                            Portals type
                        </p>
                        <ul style={{ ...textContentStyle, paddingLeft: "0", listStyleType: "none" }}>
                            <li style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
                                <PolygonPortal color="#fde288" />
                                <span><strong style={{ color: "#fff" }}>YELLOW PORTAL:</strong> leave the room with all your earnings. </span>
                            </li>
                            <li style={{ display: "flex", alignItems: "center" }}>
                                <PolygonPortal color="#b6efe7" /> {/* Un azul cian brillante */}
                                <span><strong style={{ color: "#fff" }}>BLUE PORTAL:</strong> teleportation.</span>
                            </li>
                        </ul>

                        <p style={{ margin: "0 0 10px 0", fontWeight: "bold", color: "#D1851F" }}>
                            Constellation of Portals
                        </p>

                        <div style={{
                            display: "flex",
                            alignItems: "center", // Centra el texto verticalmente respecto al canvas
                            gap: "16px"           // Espacio entre el canvas y el texto
                        }}>
                            {/* Contenedor del Canvas */}
                            <div style={{ flexShrink: 0 }}>
                                <MapNodesComponent color1="#fde288" color2="#b6efe7" />
                            </div>

                            {/* Contenedor del Texto */}
                            <div style={textContentStyle}>
                                 Every 20 seconds the portals reorganize; if you know the map you can deduce where to find the exit portals.
                            </div>
                        </div>
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