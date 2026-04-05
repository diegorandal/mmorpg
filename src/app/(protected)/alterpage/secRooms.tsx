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

            {roomsData?.map((room, index) => (
                <button
                    key={index}
                    onClick={() => handleConnection(room.ref)}
                    className="
        relative w-full max-w-md overflow-hidden
        border-4 border-[#D1851F] rounded-xl
        shadow-[0_0_15px_rgba(209,133,31,0.4)]
        transition-all duration-200 hover:scale-[1.02] hover:brightness-110 active:scale-95
        flex flex-col text-white
    "
                >
                    {/* CAPA DE IMAGEN DESENFOCADA */}
                    <div
                        className="absolute inset-0 z-0 blur-sm scale-110"
                        style={{
                            backgroundImage: `url('https://randalrpg.onepixperday.xyz/banner_${room.map}.png')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundColor: '#0f9b0a'
                        }}
                    />

                    {/* Capa de fondo degradado para legibilidad (La tuya, ahora en z-5) */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(58,4,2,0.6)_0%,rgba(0,0,0,0.85)_100%)] z-5" />

                    {/* CONTENIDO DE LA CARD (Z-10 para estar sobre el fondo) */}
                    <div className="relative z-10 flex flex-col h-full w-full p-3">

                        {/* PRIMERA LÍNEA: Nombre y Costo */}
                        <div className="flex justify-between items-center pb-1">
                            <span className="text-xl font-bold tracking-tighter uppercase">{room.name}</span>
                            <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-[#D1851F]/50">
                                <span className="text-sm text-yellow-400 font-bold">💰 {room.cost}</span>
                            </div>
                        </div>

                        {/* SEGUNDA LÍNEA: 4 Divisiones (Desc, Type, Mapa, Users) */}
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
                                <span className="text-green-400">{room.onlineUsers} 👥</span>
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}