import { SPEND_PERMISSION_MANAGER } from '@/lib/constants';
import { prepareTypedData, SpendPermission } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { Address, createPublicClient, encodeFunctionData, Hex, http, LocalAccount } from 'viem';
import { toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

function addressToFakeAccount(address: Address): LocalAccount {
    return {
        address,
        signMessage: async ({ message }) => "0x",
        signTransaction: async (transaction, options) => "0x",
        signTypedData: async (parameters) => "0x",
        publicKey: address,
        source: "local",
        type: "local"
    }
}

async function signSpendPermission(spendPermission: SpendPermission) {
  const chain = baseSepolia;
  const client = createPublicClient({
    chain,
    transport: http(),
  });
  const owner = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as Hex);
  const account = await toCoinbaseSmartAccount({
    client,
    owners: [owner, addressToFakeAccount(SPEND_PERMISSION_MANAGER)],
  });

  if (spendPermission.account !== account.address) {
    console.error("SpendPermission account does not match: " + account.address);
    return null;
  }

  const signature = await account.signTypedData(
    prepareTypedData({ chainId: chain.id, spendPermission })
  );

  return signature;
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spendPermission } = body;

    if (!spendPermission) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const signature = await signSpendPermission(spendPermission)
    console.log({signature})
    
    return NextResponse.json({ message: 'Request received successfully', signature }, { status: 200 });
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}