import { formatEther } from "ethers";

interface Room {
    name: string;
    cost: string;
    desc: string;
    type: string;
    map: string;
    ref: string;
    status: string;
    onlineUsers: number;
}

interface RoomsProps {
    roomsData: Room[];
    handleConnection: (roomName: string) => Promise<void>;
}

export default function SectionRooms({ roomsData, handleConnection }: RoomsProps) {
    return (
        <div className="flex flex-col gap-4 p-4 items-center">
            {roomsData?.map((room, index) => {
                // Definimos si la sala está cerrada
                const isClosed = room.status === "close";

                return (
                    <button
                        key={index}
                        // Deshabilitamos el clic si está cerrada
                        disabled={isClosed}
                        onClick={() => !isClosed && handleConnection(room.ref)}
                        className={`
                            relative w-full max-w-md overflow-hidden
                            border-4 rounded-xl flex flex-col text-white
                            transition-all duration-200
                            ${isClosed
                                ? "border-gray-500 opacity-75 cursor-not-allowed grayscale-[0.5]"
                                : "border-[#D1851F] shadow-[0_0_15px_rgba(209,133,31,0.4)] hover:scale-[1.02] hover:brightness-110 active:scale-95"
                            }
                        `}
                    >
                        {/* CAPA DE IMAGEN DESENFOCADA */}
                        <div
                            className="absolute inset-0 z-0 blur-[1px] scale-110"
                            style={{
                                backgroundImage: `url('https://randalrpg.onepixperday.xyz/banner_${room.map}.png')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundColor: isClosed ? '#4a4a4a' : '#0f9b0a' // Color más apagado si está cerrado
                            }}
                        />

                        {/* Capa de fondo degradado */}
                        <div className={`absolute inset-0 z-5 ${isClosed ? "bg-[radial-gradient(circle_at_center,rgba(58,4,2,0.6)_0%,rgba(0,0,0,0.7)_100%)]" : "bg-[radial-gradient(circle_at_center,rgba(58,4,2,0.4)_0%,rgba(0,0,0,0.5)_100%)]"}`} />

                        {/* CONTENIDO DE LA CARD */}
                        <div className="relative z-10 flex flex-col h-full w-full p-3">
                            <div className="flex justify-between items-center pb-1">
                                <span className={`text-xl font-bold tracking-tighter uppercase ${isClosed ? "text-gray-300" : ""}`}>
                                    {room.name}
                                </span>
                                <div className={`flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border ${isClosed ? "border-gray-500" : "border-[#D1851F]/50"}`}>
                                    <span className={`text-sm font-bold ${isClosed ? "text-gray-400" : "text-yellow-400"}`}>
                                        💰 {formatEther(room.cost)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-sm uppercase tracking-widest font-semibold pt-2">
                                <div className="flex flex-col items-start flex-1">
                                    <span className="truncate w-full text-left text-2xl">{room.desc}</span>
                                </div>
                                <div className="flex flex-col items-center px-2">
                                    <span className="text-gray-400">Type</span>
                                    <span>{room.type}</span>
                                </div>
                                <div className="flex flex-col items-center px-2">
                                    <span className="text-gray-400">Map</span>
                                    <span>{room.map}</span>
                                </div>
                                <div className="flex flex-col items-end flex-1">
                                    <span className="text-gray-400">Online</span>
                                    <span className={isClosed ? "text-gray-500" : "text-green-400"}>
                                        {room.onlineUsers} 👥
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}