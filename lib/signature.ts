import { Address, encodeAbiParameters, Hex, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { http, createPublicClient } from "viem";
import { baseSepolia } from "viem/chains";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";

const maxUint48 = 281474976710655;
const spendPermissionManagerAddress =
  "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as Address;
const nonRepeatingPeriod = 281474976672000; // max uint48, period does not repeat

const paymentEscrowAddress =
  "0x1901D7DFb5614F85D805C3adb987dB566B1d40Ed" as Address;
const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;

export async function signSpendPermission({
  usdAmount,
  operator,
  merchant,
  feeBps,
  feeRecipient,
  expiresAt,
}: {
  usdAmount: number;
  operator: Address;
  merchant: Address;
  feeBps: number;
  feeRecipient: Address;
  expiresAt: number; // unix milliseconds
}) {
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

  const extraData = encodeAbiParameters(
    [
      { name: "operator", type: "address" },
      { name: "merchant", type: "address" },
      { name: "feeBps", type: "uint16" },
      { name: "feeRecipient", type: "address" },
    ],
    [operator, merchant, feeBps, feeRecipient]
  );

  const spendPermission = {
    account: account.address,
    spender: paymentEscrowAddress,
    token: usdcAddress,
    allowance: parseUnits(usdAmount.toString(), 6),
    period: nonRepeatingPeriod,
    start: Math.ceil(Date.now() / 1000),
    end: expiresAt,
    salt: BigInt(0),
    extraData,
  };

  const signature = await account.signTypedData({
    domain: {
      name: "Spend Permission Manager",
      version: "1",
      chainId: chain.id,
      verifyingContract: spendPermissionManagerAddress,
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
  });

  return signature;
}
