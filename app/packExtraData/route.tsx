import { NextRequest, NextResponse } from 'next/server';
import { encodeAbiParameters } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operator, merchant, feeBps, feeRecipient } = body;

    if (!operator || !merchant || !feeBps || !feeRecipient) {
      return NextResponse.json({ error: 'Missing one or more required fields: operator, merchant, feeBps, feeRecipient' }, { status: 400 });
    }

    const extraData = encodeAbiParameters(
      [
        {name: "operator", type: "address"},
        {name: "merchant", type: "address"},
        {name: "feeBps", type: "uint16"},
        {name: "feeRecipient", type: "address"}
      ],
      [operator, merchant, feeBps, feeRecipient]
    )
    
    const origin = request.headers.get('origin');
    return NextResponse.json({ extraData }, { status: 200 });
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}