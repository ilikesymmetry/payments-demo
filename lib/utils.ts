import {
  Address,
  concat,
  encodeAbiParameters,
  Hex,
  keccak256,
  parseUnits,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, createPublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import {
  ERC3009_TOKEN_COLLECTOR,
  MAX_UINT48,
  NON_REPEATING_PERIOD,
  PAYMENT_DETAILS_TYPEHASH,
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
  chainId,
  account,
  usdAmount,
  operator,
  receiver,
  feeBps,
  feeReceiver,
  expiresAt,
}: {
  chainId: number;
  account: Address;
  usdAmount: number;
  operator: Address;
  receiver: Address;
  feeBps: number;
  feeReceiver: Address;
  expiresAt: number; // unix seconds
}) {
  console.log({
    chainId,
    account,
    usdAmount,
    operator,
    receiver,
    feeBps,
    feeReceiver,
    expiresAt,
  });
  const value = parseUnits(usdAmount.toString(), 6);
  const salt = BigInt(Math.ceil(Math.random() * 1000));
  const paymentDetails = {
    operator,
    payer: account,
    receiver,
    token: USDC,
    maxAmount: value,
    preApprovalExpiry: expiresAt,
    authorizationExpiry: MAX_UINT48,
    refundExpiry: MAX_UINT48,
    minFeeBps: feeBps,
    maxFeeBps: feeBps,
    feeReceiver,
    salt,
  };
  const encodedPaymentDetails = encodeAbiParameters(
    [
      { name: "operator", type: "address" },
      { name: "payer", type: "address" },
      { name: "receiver", type: "address" },
      { name: "token", type: "address" },
      { name: "maxAmount", type: "uint256" },
      { name: "preApprovalExpiry", type: "uint48" },
      { name: "authorizationExpiry", type: "uint48" },
      { name: "refundExpiry", type: "uint48" },
      { name: "minFeeBps", type: "uint16" },
      { name: "maxFeeBps", type: "uint16" },
      { name: "feeReceiver", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    [
      operator,
      zeroAddress, // payer, null for offchain convenience generating in backend
      receiver,
      USDC,
      value,
      expiresAt,
      MAX_UINT48,
      MAX_UINT48,
      feeBps,
      feeBps,
      feeReceiver,
      salt,
    ]
  );
  const paymentDetailsPreImage = concat([
    PAYMENT_DETAILS_TYPEHASH,
    encodedPaymentDetails,
  ]);
  const structHash = keccak256(paymentDetailsPreImage);
  const paymentDetailsHash = keccak256(
    encodeAbiParameters(
      [
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
        { name: "structHash", type: "bytes32" },
      ],
      [BigInt(chainId), PAYMENT_ESCROW, structHash]
    )
  );
  console.log({
    paymentDetailsHash,
    paymentDetailsFields: {
      operator,
      payer: account,
      receiver: receiver,
      token: USDC,
      maxAmount: value,
      preApprovalExpiry: expiresAt,
      authorizationExpiry: MAX_UINT48,
      refundExpiry: MAX_UINT48,
      minFeeBps: feeBps,
      maxFeeBps: feeBps,
      feeReceiver,
      salt,
    },
  });

  return {
    paymentDetails,
    authorization: {
      from: account,
      to: ERC3009_TOKEN_COLLECTOR,
      value,
      validAfter: 0,
      validBefore: expiresAt,
      nonce: paymentDetailsHash,
    },
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

  console.log("account.address", account.address);

  if (authorization.from !== account.address) {
    console.error("Cannot sign for Authorization from");
    return null;
  }

  const signature = await account.signTypedData(
    prepareTypedData({ chainId: chain.id, authorization })
  );

  return signature;
}
