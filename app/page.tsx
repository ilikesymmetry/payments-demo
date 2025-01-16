'use client';

import { zeroAddress } from "viem";
import { useBasePay } from "../lib/hooks";

export default function App() {
  const operator = zeroAddress // TODO fill in
  const merchant = zeroAddress // TODO fill in
  const feeBps = 100
  const feeRecipient = operator

  const {requestUsdcPayment} = useBasePay()

  return (
    <div className="flex items-center justify-center h-screen">
      <button 
        className="bg-[#0052FF] px-6 py-3.5 rounded-md font-bold flex items-center space-x-2 text-lg"
        onClick={() => requestUsdcPayment({
          usdAmount: 10, 
          operator, 
          merchant, 
          feeBps, 
          feeRecipient, 
          expiresAt: Date.now() + 10 * 60 * 1000
        })
      }>
        <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.73965 16.4788C13.409 16.4788 17.1944 12.8141 17.1944 8.29208C17.1944 3.77009 13.409 0.105408 8.73965 0.105408C4.07032 0.105408 0.676087 3.40467 0.313843 7.60342H11.4891V8.98075H0.313843C0.676087 13.1795 4.3094 16.4788 8.73965 16.4788Z" fill="white"/>
        </svg>
        <p>Base Pay</p>
        </button>
    </div>
  );
}
