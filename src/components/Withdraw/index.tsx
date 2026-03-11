'use client';

import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { useSession } from 'next-auth/react';
import skillstakeABI from '@/abi/skillstake.json';

type PayProps = { amount: number; onSuccess?: () => void; };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const Withdraw = ({ amount, onSuccess }: PayProps) => {
    const contract = '0x2CBD6A60069B95C85f3b230164A0a166b0576dE7';
    const API = "https://randal.onepixperday.xyz/api";

    const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
    const [transactionId, setTransactionId] = useState<string>('');
    const { data: session } = useSession();

    const client = createPublicClient({
        chain: worldchain,
        transport: http('https://worldchain-mainnet.g.alchemy.com/public'),
    });

    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        isError,
    } = useWaitForTransactionReceipt({
        client: client as any,
        appConfig: {
            app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        },
        transactionId: transactionId,
    });

    // Manejo de estados de la transacción on-chain
    useEffect(() => {
        if (transactionId && !isConfirming) {
            if (isConfirmed) {
                setStatus('success');
                setTimeout(() => {
                    setStatus('idle');
                    onSuccess?.();
                }, 2000);
            } else if (isError) {
                setStatus('failed');
                setTimeout(() => setStatus('idle'), 3000);
            }
        }
    }, [isConfirmed, isConfirming, isError, transactionId, onSuccess]);

    const onClickClaim = async () => {
        if (status === 'pending') return;

        setTransactionId('');
        setStatus('pending');

        try {
            if (!session?.user?.id) throw new Error("No session found");
            const address = session.user.id.toLowerCase();

            // 1️⃣ Pedir firma al backend
            const response = await fetch(`${API}/initiate-withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: address,
                    amount: tokenToDecimals(amount, Tokens.WLD).toString(),
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get claim signature.');
            }

            const { signature, uuid } = await response.json();

            // 2️⃣ Enviar transacción vía MiniKit
            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: contract,
                        abi: skillstakeABI,
                        functionName: 'gameclaim',
                        args: [
                            {
                                to: address,
                                amount: tokenToDecimals(amount, Tokens.WLD).toString(),
                                uuid: uuid,
                                signature: signature,
                            }
                        ],
                    },
                ],
            });

            if (finalPayload.status === 'success') {
                setTransactionId(finalPayload.transaction_id);
                await sleep(2000);

                // 3️⃣ Confirmar en backend
                const confirmRes = await fetch(`${API}/confirm-withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reference: uuid, transaction_id: finalPayload.transaction_id }),
                });

                if (!confirmRes.ok) throw new Error('Failed to confirm withdraw.');

                // El useEffect se encargará de poner el estado 'success' cuando la tx se confirme en cadena
            } else {
                setStatus('failed');
                setTimeout(() => setStatus('idle'), 3000);
            }

        } catch (err) {
            console.error('Error:', err);
            setStatus('failed');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    // Helpers de Estilo y Contenido
    const getButtonContent = () => {
        switch (status) {
            case 'pending': return 'Processing...';
            case 'success': return '✓ Successful Withdraw';
            case 'failed': return '✕ Failed to withdraw';
            default: return `Withdraw ${amount} WLD`;
        }
    };

    const getButtonStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            width: "100%",
            padding: "14px",
            borderRadius: "10px",
            border: "none",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: status === 'pending' ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            background: "#333", // Color gris oscuro por defecto (tipo secondary)
            color: "white"
        };

        if (status === 'pending') baseStyle.background = "#555";
        if (status === 'failed') baseStyle.background = "#ff5252";
        if (status === 'success') baseStyle.background = "#00c853";

        return baseStyle;
    };

    return (
        <div style={{ width: '100%' }}>
            <button
                onClick={onClickClaim}
                disabled={status === 'pending'}
                style={getButtonStyle()}
            >
                {getButtonContent()}
            </button>
        </div>
    );
};