import { Address, encodeAbiParameters, Hex, parseUnits } from "viem";
import { useConnect, useAccount, useSignTypedData, useChainId } from "wagmi";

export function useBasePay(args?: {
  paymentEscrowAddress?: Address;
  usdcAddress?: Address;
}) {
  const paymentEscrowAddress =
    args?.paymentEscrowAddress ?? "0xDE6856Fb76b4093A92d640831A7F06A4E9aBF11c";
  const usdcAddress =
    args?.usdcAddress ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const { signSpendPermission } = useSpendPermission();

  async function requestUsdcPayment({
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
    const res = await signSpendPermission({
      spender: paymentEscrowAddress,
      token: usdcAddress,
      allowance: parseUnits(usdAmount.toString(), 6),
      end: Math.floor(expiresAt / 1000), // unix seconds
      extraData: encodeAbiParameters(
        [
          { name: "operator", type: "address" },
          { name: "merchant", type: "address" },
          { name: "feeBps", type: "uint16" },
          { name: "feeRecipient", type: "address" },
        ],
        [operator, merchant, feeBps, feeRecipient]
      ),
    });
    return res;
  }

  return { requestUsdcPayment };
}

function useSpendPermission() {
  const maxUint48 = 281474976710655;
  const spendPermissionManagerAddress =
    "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as Address;
  const nonRepeatingPeriod = 281474976672000; // max uint48, period does not repeat

  const { connectors, connectAsync } = useConnect();
  const account = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();

  async function signSpendPermission({
    spender,
    token,
    allowance,
    period,
    start,
    end,
    salt,
    extraData,
  }: {
    spender: Address;
    token: Address;
    allowance: bigint;
    period?: number;
    start?: number;
    end?: number;
    salt?: bigint;
    extraData?: Hex;
  }) {
    // setIsDisabled(true);
    let accountAddress = account?.address;
    if (!accountAddress) {
      try {
        const requestAccounts = await connectAsync({
          connector: connectors[0],
        });
        accountAddress = requestAccounts.accounts[0];
      } catch {
        return;
      }
    }

    const spendPermission = {
      account: accountAddress,
      spender,
      token,
      allowance,
      period: period ?? nonRepeatingPeriod,
      start: start ?? Math.ceil(Date.now() / 1000),
      end: end ?? maxUint48,
      salt: salt ?? BigInt(0),
      extraData: extraData ?? "0x",
    };

    try {
      const signature = await signTypedDataAsync({
        domain: {
          name: "Spend Permission Manager",
          version: "1",
          chainId: chainId,
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
      return { spendPermission, signature };
    } catch (e) {
      console.error(e);
    }
  }

  return { signSpendPermission };
}
