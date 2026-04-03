interface Room {
    name: string;
    cost: string;
    desc: string;
    type: string;
    map: string;
    ref: string;
    onlineUsers: number;
}

interface RoomsProps {
    roomsData: Room[];
    handleConnection: (roomName: string) => Promise<void>;
}

export default function SectionRooms({ roomsData, handleConnection }: RoomsProps) {
    return (
        <div className="flex flex-col gap-4 p-4 items-center">
            <h2 className="text-2xl font-bold text-[#D1851F] tracking-widest uppercase">Rooms</h2>

            {roomsData?.map((room, index) => (
                <button
                    key={index}
                    onClick={() => handleConnection(room.ref)} // Usamos type para conectar
                    className="
                        relative w-full max-w-md overflow-hidden
                        border-4 border-[#D1851F] rounded-xl
                        shadow-[0_0_15px_rgba(209,133,31,0.4)]
                        transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95
                        flex flex-col text-white
                    "
                    style={{
                        height: '140px',
                        backgroundColor: '#0f9b0a',
                        backgroundImage: `url('/maps/${room.map}.png')`, // Asume que tienes imágenes con el nombre del mapa
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    {/* Capa de fondo degradado para legibilidad (similar a tu botón) */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(58,4,2,0.6)_0%,rgba(0,0,0,0.85)_100%)] z-0" />

                    {/* CONTENIDO DE LA CARD (Z-10 para estar sobre el fondo) */}
                    <div className="relative z-10 flex flex-col h-full w-full p-3 justify-between">

                        {/* PRIMERA LÍNEA: Nombre y Costo */}
                        <div className="flex justify-between items-center border-b border-[#D1851F]/30 pb-2">
                            <span className="text-xl font-bold tracking-tighter uppercase">{room.name}</span>
                            <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-[#D1851F]/50">
                                <span className="text-sm text-yellow-400 font-bold">💰 {room.cost}</span>
                            </div>
                        </div>

                        {/* SEGUNDA LÍNEA: 4 Divisiones (Desc, Type, Mapa, Users) */}
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-semibold pt-2">
                            <div className="flex flex-col items-start flex-1">
                                <span className="text-gray-400">Desc</span>
                                <span className="truncate w-full text-left">{room.desc}</span>
                            </div>
                            <div className="flex flex-col items-center px-2 border-x border-[#D1851F]/20">
                                <span className="text-gray-400">Type</span>
                                <span>{room.type}</span>
                            </div>
                            <div className="flex flex-col items-center px-2">
                                <span className="text-gray-400">Map</span>
                                <span>{room.map}</span>
                            </div>
                            <div className="flex flex-col items-end flex-1">
                                <span className="text-gray-400">Online</span>
                                <span className="text-green-400">{room.onlineUsers} 👤</span>
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}