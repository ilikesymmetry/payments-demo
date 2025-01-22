import { PaymentEscrowAbi } from '@/lib/abi/PaymentEscrow';
import { PAYMENT_ESCROW } from '@/lib/constants';
import { operatorClient } from '@/lib/operator';
import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spendPermission } = body;

    if (!spendPermission) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const value = spendPermission.allowance
    const txHash = await operatorClient.sendTransaction({to: PAYMENT_ESCROW, data: encodeFunctionData({abi: PaymentEscrowAbi, functionName: "capture", args: [spendPermission, value]})})
    console.log({txHash})
    
    return NextResponse.json({ message: 'Request received successfully', txHash }, { status: 200 });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}