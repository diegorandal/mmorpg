import { Insights } from '@app-oracle/insights';
import { NextResponse } from 'next/server';

const insights = new Insights({
    apiKey: process.env.APP_ORACLE_API_KEY!,
});

export async function POST(request: Request) {

    try {
        
        const body = await request.json();
        const { walletAddress, stats } = body;

        const result = await insights.getFeedbackLink({
            appVersion: '0.1.2',
            wallet: walletAddress,
            metadata: {
                username: stats.username,
                balance: stats.balance,
                xp: stats.xp,
                kills: stats.kills,
            },
            requestAppReview: true,
            redirectUrl: 'https://world.org/mini-app?app_id=app_bea22496f63d09ceaaf9b9031401686b' // Para que vuelvan a tu juego
        });

        // Usamos NextResponse en lugar de res.status().json()
        return NextResponse.json({ url: result.url });

    } catch (error) {
        console.error('Error en Insights SDK:', error);
        return NextResponse.json(
            { error: 'Error generating feedback link' },
            { status: 500 }
        );
    }
}