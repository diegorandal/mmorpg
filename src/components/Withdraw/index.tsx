'use client';

import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { useSession } from 'next-auth/react';
import treasureGameABI from '@/abi/skillstake.json';

export const Withdraw = ({ onSuccess }: { onSuccess: () => void }) => {

    const contract = '0x2CBD6A60069B95C85f3b230164A0a166b0576dE7';

    const [buttonState, setButtonState] = useState<'pending' | 'success' | 'failed' | undefined>(undefined);
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
        error,
    } = useWaitForTransactionReceipt({
        client: client as any,
        appConfig: {
            app_id: process.env.NEXT_PUBLIC_APP_ID as `app_${string}`,
        },
        transactionId: transactionId,
    });

    useEffect(() => {

        if (transactionId && !isConfirming) {

            if (isConfirmed) {

                setButtonState('success');

                setTimeout(() => {
                    setButtonState(undefined);
                    onSuccess();
                }, 2000);

            } else if (isError) {

                console.error('Transaction failed:', error);
                setButtonState('failed');

                setTimeout(() => {
                    setButtonState(undefined);
                }, 2000);

            }

        }

    }, [isConfirmed, isConfirming, isError, error, transactionId, onSuccess]);


    const onClickClaim = async () => {

        setTransactionId('');
        setButtonState('pending');

        try {

            if (!session?.user?.id) return;

            const user = await MiniKit.getUserByUsername(session.user.username);
            const address = user.walletAddress;

            // pedir firma al backend
            const response = await fetch('/api/claim-reward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });

            if (!response.ok) {

                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get claim signature.');

            }

            const { amount, signature, deadline } = await response.json();

            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: contract,
                        abi: treasureGameABI,
                        functionName: 'claim',
                        args: [
                            {
                                to: address,
                                amount: amount,
                                deadline: deadline,
                                signature: signature,
                            }
                        ],
                    },
                ],
            });

            if (finalPayload.status === 'success') {

                console.log(
                    'Transaction submitted:',
                    finalPayload.transaction_id,
                );

                setTransactionId(finalPayload.transaction_id);

            } else {

                console.error('Transaction submission failed:', finalPayload);
                setButtonState('failed');

                setTimeout(() => {
                    setButtonState(undefined);
                }, 3000);

            }

        } catch (err) {

            console.error('Error sending transaction:', err);

            setButtonState('failed');

            setTimeout(() => {
                setButtonState(undefined);
            }, 3000);

        }

    };

    return (

        <div className="grid w-full gap-4">

            <LiveFeedback
                label={{
                    failed: 'Failed to claim',
                    pending: 'Claiming reward',
                    success: 'Reward claimed!',
                }}
                state={buttonState}
                className="w-full"
            >

                <Button
                    onClick={onClickClaim}
                    disabled={buttonState === 'pending'}
                    size="lg"
                    variant="secondary"
                    className="w-full"
                >
                    Claim Reward
                </Button>

            </LiveFeedback>

        </div>

    );
};