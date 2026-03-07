'use client';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { useState } from 'react';

export const Pay = () => {

  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);

  const API = "https://randal.onepixperday.xyz/api";

  const onClickPay = async () => {

    try {

      const address = "0x2CBD6A60069B95C85f3b230164A0a166b0576dE7";

      setButtonState('pending');

      // 1️⃣ pedir reference al backend
      const res = await fetch(`${API}/initiate-payment`, {
        method: 'POST',
      });

      const { id } = await res.json();

      // 2️⃣ abrir pago en World App
      const result = await MiniKit.commandsAsync.pay({
        reference: id,
        to: address,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(0.1, Tokens.WLD).toString(),
          }
        ],
        description: 'Poniendo estaba la ganza.',
      });

      console.log('MiniKit finalPayload completo:', JSON.stringify(result.finalPayload, null, 2));

      if (result.finalPayload.status === 'success') {

        // 3️⃣ verificar pago en backend
        const verify = await fetch(`${API}/confirm-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reference: result.finalPayload.reference,
            transaction_id: result.finalPayload.transaction_id
          })
        });

        const payment = await verify.json();

        console.log("Payment verification:", payment);

        if (payment.success) {

          setButtonState("success");

        } else {

          setButtonState("failed");

        }

      } else {

        setButtonState("failed");

      }

    } catch (err) {

      console.error("Payment error:", err);
      setButtonState("failed");

    }

    setTimeout(() => {
      setButtonState(undefined);
    }, 4000);
  };

  return (
    <div className="grid w-full gap-4">

      <p className="text-lg font-semibold">Pay</p>

      <LiveFeedback
        label={{
          failed: 'Payment failed',
          pending: 'Payment pending',
          success: 'Payment successful',
        }}
        state={buttonState}
        className="w-full"
      >

        <Button
          onClick={onClickPay}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Pay
        </Button>

      </LiveFeedback>

    </div>
  );
};