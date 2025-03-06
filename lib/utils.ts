import { Address, encodeAbiParameters, Hex, keccak256, parseUnits } from "viem";
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

export type Authorization = {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: number;
  validBefore: number;
  nonce: Hex;
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
  expiresAt: number; // unix milliseconds
}) {
  const value = parseUnits(usdAmount.toString(), 6);
  const validAfter = 0;
  const salt = BigInt(Math.ceil(Math.random() * 1000));
  const paymentDetails = encodeAbiParameters(
    [
      { name: "token", type: "address" },
      { name: "buyer", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "captureDeadline", type: "uint48" },
      { name: "operator", type: "address" },
      { name: "captureAddress", type: "address" },
      { name: "feeBps", type: "uint16" },
      { name: "feeRecipient", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    [
      USDC,
      account,
      value,
      BigInt(validAfter),
      BigInt(expiresAt),
      MAX_UINT48,
      operator,
      merchant,
      feeBps,
      feeRecipient,
      salt,
    ]
  );
  const paymentDetailsHash = keccak256(paymentDetails);

  return {
    paymentDetails,
    authorization: prepareAuthorization({
      from: account,
      to: PAYMENT_ESCROW,
      value,
      validAfter,
      validBefore: expiresAt,
      nonce: paymentDetailsHash,
    }),
  };
}

export function prepareAuthorization({
  from,
  to,
  value,
  validAfter,
  validBefore,
  nonce,
}: {
  from: Address;
  to: Address;
  value: bigint;
  validAfter?: number;
  validBefore?: number;
  nonce: Hex;
}) {
  return {
    from,
    to,
    value,
    validAfter: validAfter ?? Math.ceil(Date.now() / 1000),
    validBefore: validBefore ?? MAX_UINT48,
    nonce,
  };
}

export function prepareTypedData({
  chainId,
  authorization,
}: {
  chainId: number;
  authorization: Authorization;
}) {
  return {
    domain: {
      name: "USDC",
      version: "2",
      chainId,
      verifyingContract: USDC,
    },
    types: {
      ReceiveWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    },
    primaryType: "ReceiveWithAuthorization",
    message: authorization,
  } as any;
}

export async function signAuthorization(authorization: Authorization) {
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

  if (authorization.from !== account.address) {
    console.error("Cannot sign for Authorization from");
    return null;
  }

  const signature = await account.signTypedData(
    prepareTypedData({ chainId: chain.id, authorization })
  );

  return signature;
}
