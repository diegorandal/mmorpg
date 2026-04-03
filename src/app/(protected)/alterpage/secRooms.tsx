interface RoomsProps {
    usersOnline: number;
    handleConnection: (roomName: string) => Promise<void>; // Definimos que recibe una función
}

export default function SectionRooms({ usersOnline, handleConnection }: RoomsProps) {
    return (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <h2>Rooms</h2>

            <p style={{margin: 0, fontSize: "1.2rem", fontWeight: "bold", color: "white"}}>
                {usersOnline !== null ? `${usersOnline}/10 player${usersOnline === 1 ? '' : 's'} online ` : 'Loading data...'}
            </p>

            <button
                disabled={usersOnline > 9}
                onClick={() => handleConnection("free_room")}
                style={{
                    padding: '18px 40px',
                    fontSize: '1.4rem',
                    cursor: 'pointer',
                    backgroundColor: '#75864b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    width: '100%',
                    maxWidth: '300px',
                    opacity: 1,
                    transition: '0.2s'
                }}
            >
                {usersOnline > 9
                    ? "SERVER FULL"
                    : (usersOnline ? "CONNECTING..." : `FREE (0.00 wld)`)}
            </button>



        </div>
    );
}