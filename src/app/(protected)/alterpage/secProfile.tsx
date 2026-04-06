'use client'
type PlayerProfile = { wallet: string; username: string; balance: string; xp: number; kills: number; characterid: number; characters: number[]; };

type Props = { profile: PlayerProfile; };

export default function SectionProfile({ profile }: Props) {

    return (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span className="text-2xl bg-gradient-to-b from-yellow-300 to-orange-500 bg-clip-text text-transparent font-bold truncate">
                {profile.username}
            </span>
            <span>{profile.wallet}</span>
            <span>{profile.xp}</span>
            <span>{profile.kills}</span>

        </div>
    );
}