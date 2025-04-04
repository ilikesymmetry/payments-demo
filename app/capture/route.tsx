import { PaymentEscrowAbi } from '@/lib/abi/PaymentEscrow';
import { FEE_BPS, FEE_RECEIVER, PAYMENT_ESCROW } from '@/lib/constants';
import { operatorClient } from '@/lib/operator';
import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorization, paymentDetails } = body;
    console.log(body)

    if (!authorization || !paymentDetails) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const value = body?.value ?? authorization.value
    const txHash = await operatorClient.sendTransaction({to: PAYMENT_ESCROW, data: encodeFunctionData({abi: PaymentEscrowAbi, functionName: "capture", args: [paymentDetails, value, FEE_BPS, FEE_RECEIVER]})})
    console.log({txHash})
    
    return NextResponse.json({ txHash }, { status: 200 });
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}