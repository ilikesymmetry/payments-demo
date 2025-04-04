import { PaymentEscrowAbi } from '@/lib/abi/PaymentEscrow';
import { ERC3009_TOKEN_COLLECTOR, PAYMENT_ESCROW } from '@/lib/constants';
import { operatorClient } from '@/lib/operator';
import { NextRequest, NextResponse } from 'next/server';
import { encodeFunctionData } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authorization, paymentDetails, signature } = body;
    console.log(body)

    if (!authorization || !paymentDetails || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const value = body?.value ?? authorization.value
    console.log({value, ERC3009_TOKEN_COLLECTOR})
    const txHash = await operatorClient.sendTransaction({to: PAYMENT_ESCROW, data: encodeFunctionData({abi: PaymentEscrowAbi, functionName: "authorize", args: [paymentDetails, value, ERC3009_TOKEN_COLLECTOR, signature]})})
    console.log({txHash})
    
    return NextResponse.json({ txHash }, { status: 200 });
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}