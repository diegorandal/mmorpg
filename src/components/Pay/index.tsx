'use client';
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

type PayProps = {
  amount: number;
  description?: string;
  onSuccess?: () => void;
};

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
      if (data.success) return data;
    } catch (err) { console.warn("Verify error:", err); }
    if (attempt < retries) await sleep(delay);
  }
  return { success: false };
}

export const Pay = ({ amount, description, onSuccess }: PayProps) => {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const { data: session } = useSession();

  const API = "https://randal.onepixperday.xyz/api";

  const onClickPay = async () => {
    if (status === 'pending') return;

    try {
      const address = "0x2CBD6A60069B95C85f3b230164A0a166b0576dE7";
      setStatus('pending');

      if (!session?.user?.id) throw new Error("No session");
      const wallet = session.user.id.toLowerCase();

      // 1️⃣ Iniciar pago
      const res = await fetch(`${API}/initiate-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: wallet,
          amount: tokenToDecimals(amount, Tokens.WLD).toString(),
        })
      });

      const { id } = await res.json();

      // 2️⃣ World App SDK
      const result = await MiniKit.commandsAsync.pay({
        reference: id,
        to: address,
        tokens: [{
          symbol: Tokens.WLD,
          token_amount: tokenToDecimals(amount, Tokens.WLD).toString()
        }],
        description: description ?? 'Deposit WLD',
      });

      if (result.finalPayload.status === 'success') {
        const payment = await verifyWithRetry(
          `${API}/confirm-payment`,
          {
            reference: result.finalPayload.reference,
            transaction_id: result.finalPayload.transaction_id
          }
        );

        if (payment.success) {
          setStatus("success");
          // Esperar un poco para que el usuario vea el éxito antes de cerrar el modal
          setTimeout(() => onSuccess?.(), 1500);
        } else {
          setStatus("failed");
        }
      } else {
        await fetch(`${API}/cancel-payment`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: id })
        });
        setStatus("failed");
      }

    } catch (err) {
      console.error("Payment error:", err);
      setStatus("failed");
    }

    // Resetear estado después de un tiempo si falló
    if (status !== 'success') {
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  // Configuración dinámica del botón según el estado
  const getButtonContent = () => {
    switch (status) {
      case 'pending': return 'Processing...';
      case 'success': return '✓ Success!';
      case 'failed': return '✕ Failed, try again';
      default: return `Deposit ${amount} WLD`;
    }
  };

  const getButtonStyle = () => {
    const baseStyle: React.CSSProperties = {
      width: "100%",
      padding: "14px",
      borderRadius: "10px",
      border: "none",
      fontSize: "1rem",
      fontWeight: "bold",
      cursor: status === 'pending' ? "not-allowed" : "pointer",
      transition: "all 0.2s ease",
      background: "#477fe7", // Verde por defecto
      color: "white"
    };

    if (status === 'pending') baseStyle.background = "#555";
    if (status === 'failed') baseStyle.background = "#ff5252";
    if (status === 'success') baseStyle.background = "#00c853";

    return baseStyle;
  };

  return (
    <button
      onClick={onClickPay}
      disabled={status === 'pending'}
      style={getButtonStyle()}
    >
      {getButtonContent()}
    </button>
  );
};