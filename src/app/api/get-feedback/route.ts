import { Insights } from '@app-oracle/insights';
import { NextApiRequest, NextApiResponse } from 'next';

const insights = new Insights({
    apiKey: process.env.APP_ORACLE_API_KEY!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const { walletAddress, stats } = req.body;
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

        return res.status(200).json({ url: result.url });
    } catch (error) {
        return res.status(500).json({ error: 'Error generating link' });
    }
}