import { Address, encodeAbiParameters, Hex, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, createPublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import {
  MAX_UINT48,
  NON_REPEATING_PERIOD,
  PAYMENT_ESCROW,
  SPEND_PERMISSION_MANAGER,
  USDC,
} from "./constants";

export type SpendPermission = {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: Hex;
};

export function prepareUsdcPayment({
  account,
  usdAmount,
  operator,
  merchant,
  feeBps,
  feeRecipient,
  expiresAt,
}: {
  account: Address;
  usdAmount: number;
  operator: Address;
  merchant: Address;
  feeBps: number;
  feeRecipient: Address;
  expiresAt: number; // unix seconds
}) {
  const extraData = encodeAbiParameters(
    [
      { name: "operator", type: "address" },
      { name: "merchant", type: "address" },
      { name: "feeBps", type: "uint16" },
      { name: "feeRecipient", type: "address" },
    ],
    [operator, merchant, feeBps, feeRecipient]
  );

  return prepareSpendPermission({
    account,
    spender: PAYMENT_ESCROW,
    token: USDC,
    allowance: parseUnits(usdAmount.toString(), 6),
    end: expiresAt,
    extraData,
  });
}

export function prepareSpendPermission({
  account,
  spender,
  token,
  allowance,
  period,
  start,
  end,
  salt,
  extraData,
}: {
  account: Address;
  spender: Address;
  token: Address;
  allowance: bigint;
  period?: number;
  start?: number;
  end?: number;
  salt?: bigint;
  extraData?: Hex;
}) {
  return {
    account,
    spender,
    token,
    allowance,
    period: period ?? NON_REPEATING_PERIOD,
    start: start ?? Math.ceil(Date.now() / 1000),
    end: end ?? MAX_UINT48,
    salt: salt ?? BigInt(0),
    extraData: extraData ?? "0x",
  };
}

export function prepareTypedData({
  chainId,
  spendPermission,
}: {
  chainId: number;
  spendPermission: SpendPermission;
}) {
  return {
    domain: {
      name: "Spend Permission Manager",
      version: "1",
      chainId,
      verifyingContract: SPEND_PERMISSION_MANAGER,
    },
    types: {
      SpendPermission: [
        { name: "account", type: "address" },
        { name: "spender", type: "address" },
        { name: "token", type: "address" },
        { name: "allowance", type: "uint160" },
        { name: "period", type: "uint48" },
        { name: "start", type: "uint48" },
        { name: "end", type: "uint48" },
        { name: "salt", type: "uint256" },
        { name: "extraData", type: "bytes" },
      ],
    },
    primaryType: "SpendPermission",
    message: spendPermission,
  } as any;
}

export async function signSpendPermission(spendPermission: SpendPermission) {
  const chain = baseSepolia;
  const client = createPublicClient({
    chain,
    transport: http(),
  });
  const owner = privateKeyToAccount(process.env.OWNER_PRIVATE_KEY as Hex);
  const account = await toCoinbaseSmartAccount({
    client,
    owners: [owner],
  });

  if (spendPermission.account !== account.address) {
    console.error("Cannot sign for SpendPermission account");
    return null;
  }

  const signature = await account.signTypedData(
    prepareTypedData({ chainId: chain.id, spendPermission })
  );

  return signature;
}
