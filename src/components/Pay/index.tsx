'use client';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

type PayProps = { amount: number; description?: string; onSuccess?: () => void;};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyWithRetry(url: string, body: any, retries = 5, delay = 1200) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      // ✅ éxito → salir inmediatamente
      if (data.success) { return data; }
    } catch (err) { console.warn("Verify error:", err); }
    // ⏳ esperar antes del siguiente intento
    if (attempt < retries) await sleep(delay);
  }
  return { success: false }; // ❌ todos fallaron
}

  export const Pay = ({ amount, description, onSuccess }: PayProps) => {

  const [buttonState, setButtonState] = useState<'pending' | 'success' | 'failed' | undefined>(undefined);
  const { data: session } = useSession();

  const API = "https://randal.onepixperday.xyz/api";

  const onClickPay = async () => {

    try {

      const address = "0x2CBD6A60069B95C85f3b230164A0a166b0576dE7";

      setButtonState('pending');

      if (!session?.user?.id) return;
      const wallet = session.user.id.toLowerCase();

      // 1️⃣ pedir reference al backend y mandarle wallet y amount HC por ahora
      const res = await fetch(`${API}/initiate-payment`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: wallet,
          amount: tokenToDecimals(amount, Tokens.WLD).toString(),
        })
      });

      const { id } = await res.json();

      // 2️⃣ abrir pago en World App
      const result = await MiniKit.commandsAsync.pay({
        reference: id,
        to: address,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(amount, Tokens.WLD).toString()
          }
        ],
        description: description ?? 'Payment',
      });

      //console.log('MiniKit finalPayload completo:', JSON.stringify(result.finalPayload, null, 2));

      await sleep(2000);

      if (result.finalPayload.status === 'success') {

        const payment = await verifyWithRetry(
          `${API}/confirm-payment`,
          {
            reference: result.finalPayload.reference,
            transaction_id: result.finalPayload.transaction_id
          }, 6, 1200    // 6 intentos con 1200ms entre intentos
        );

        if (payment.success) {
          setButtonState("success");
          onSuccess?.();
        } else {
          setButtonState("failed");
        }

      } else {

        // Marcar como cancelada
        const res = await fetch(`${API}/cancel-payment`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: id,
          })  
        });
        
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

      <LiveFeedback label={{failed: 'Deposit failed', pending: 'Deposit pending', success: 'Deposit successful'}} state={buttonState} className="w-full">

        <Button onClick={onClickPay} disabled={buttonState === 'pending'} size="lg" variant="primary" className="w-full">
          Deposit
        </Button>

      </LiveFeedback>

    </div>
  );
};
