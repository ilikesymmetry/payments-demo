import { SPEND_PERMISSION_MANAGER } from '@/lib/constants';
import { prepareTypedData, SpendPermission } from '@/lib/utils';
import { NextRequest, NextResponse } from 'next/server';
import { Address, createPublicClient, Hex, http, LocalAccount } from 'viem';
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
    throw Error("SpendPermission account does not match: " + account.address);
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
      return NextResponse.json({ error: 'Missing required fields: spendPermission' }, { status: 400 });
    }

    const signature = await signSpendPermission(spendPermission)
    console.log({signature})
    
    const origin = request.headers.get('origin');
    return NextResponse.json({ signature }, { status: 200, headers: {'Access-Control-Allow-Origin': origin as string}});
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function OPTIONS(req: Request) {
    const origin = req.headers.get('origin');
    const allowedDomainPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)?spin\.dev$/;
  
    if (origin && allowedDomainPattern.test(origin)) {
      return NextResponse.json({}, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Authorization, Content-Type, Accept',
          'Access-Control-Allow-Credentials': 'true',
        },
      });
    }
  
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }