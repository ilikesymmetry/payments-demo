'use client';

import Link from "next/link";
import { useBasePay } from "../lib/hooks";
import { FEE_BPS, FEE_RECEIVER, MERCHANT, OPERATOR } from "@/lib/constants";
import { baseSepolia } from "viem/chains";

export default function App() {
  // TODO fill in
  const receiver = MERCHANT
  const feeBps = FEE_BPS
  const feeReceiver = FEE_RECEIVER

  const {authorization, signature, authorizationTxHash, captureTxHash, requestUsdcPayment, authorizeUsdcPayment, captureUsdcPayment} = useBasePay()

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col space-y-4 w-[180px] relative">
        <button 
          className="bg-[#0052FF] px-6 py-3 rounded-md font-bold flex items-center justify-center space-x-2 text-lg"
          onClick={() => requestUsdcPayment({
            usdAmount: 0.01, 
            operator: OPERATOR, 
            receiver, 
            feeBps, 
            feeReceiver, 
            expiresAt: Math.ceil(Date.now() / 1000) + 60 * 60 * 24 * 365
          })
        }>
          <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8.73965 16.4788C13.409 16.4788 17.1944 12.8141 17.1944 8.29208C17.1944 3.77009 13.409 0.105408 8.73965 0.105408C4.07032 0.105408 0.676087 3.40467 0.313843 7.60342H11.4891V8.98075H0.313843C0.676087 13.1795 4.3094 16.4788 8.73965 16.4788Z" fill="white"/>
          </svg>
          <p>Base Pay</p>
        </button>
        <div className="absolute top-12 w-full flex flex-col space-y-4">
          {authorization && signature && !authorizationTxHash && (
            <button className="border rounded-md px-6 py-3 w-full" onClick={() => authorizeUsdcPayment()}>
              Auth
            </button>
          )}
          {authorizationTxHash && (
            <Link className="px-6 py-3 w-full flex justify-center" href={`${baseSepolia.blockExplorers.default.url}/tx/${authorizationTxHash}`} target="_blank">
              View Auth ↗️
            </Link>
          )}
          {authorizationTxHash && !captureTxHash && (
            <button className="border rounded-md px-6 py-3 w-full" onClick={() => captureUsdcPayment()}>
              Capture
            </button>
          )}
          {captureTxHash && (
            <Link className="px-6 py-3 w-full flex justify-center" href={`${baseSepolia.blockExplorers.default.url}/tx/${captureTxHash}`} target="_blank">
              View Capture ↗️
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}