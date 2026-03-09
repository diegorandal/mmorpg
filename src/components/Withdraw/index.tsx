'use client';

import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit } from '@worldcoin/minikit-js';
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react';
import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { worldchain } from 'viem/chains';
import { useSession } from 'next-auth/react';
import skillstakeABI from '@/abi/skillstake.json';

export const Withdraw = ({ onSuccess }: { onSuccess: () => void }) => {

    const contract = '0x2CBD6A60069B95C85f3b230164A0a166b0576dE7';
    const API = "https://randal.onepixperday.xyz/api";

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
            const address = session.user.id.toLowerCase();

            // pedir firma al backend
            const response = await fetch(`${API}/initiate-withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            });

            if (!response.ok) {

                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to get claim signature.');

            } else {

                console.log('backend OK respondio:', response);

            }

            const { amount, signature, uuid } = await response.json();

            console.log(`wallet: ${address} amount: ${amount} uuid: ${uuid} signature: ${signature}`);

            const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
                transaction: [
                    {
                        address: contract,
                        abi: skillstakeABI,
                        functionName: 'gameclaim',
                        args: [
                            {
                                to: address,
                                amount: amount,
                                uuid: uuid,
                                signature: signature,
                            }
                        ],
                    },
                ],
            });

            console.log('finalpayload:', finalPayload);

            if (finalPayload.status === 'success') {

                //LLAMAR A BACKEND Y DECIRLE: CHE, YA ESTA OK LA TX

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