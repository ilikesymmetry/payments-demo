import { useState } from "react";
import { Address, Hex, zeroAddress } from "viem";
import { useConnect, useAccount, useSignTypedData, useChainId } from "wagmi";
import { prepareTypedData, prepareUsdcPayment, SpendPermission } from "./utils";
import { API_ACCOUNT } from "./constants";

export function useBasePay(args?: { useApiAccount?: boolean }) {
  const account = useAccount();
  const { signSpendPermission } = useSpendPermission({
    useApiAccount: args?.useApiAccount,
  });
  const [spendPermission, setSpendPermission] = useState<SpendPermission>();
  const [signature, setSignature] = useState<Hex>();
  const [authorized, setAuthorized] = useState<boolean>(false);

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
    let spendPermission = prepareUsdcPayment({
      account: account.address ?? zeroAddress,
      usdAmount,
      operator,
      merchant,
      feeBps,
      feeRecipient,
      expiresAt,
    });

    if (args?.useApiAccount) {
      spendPermission.account = API_ACCOUNT;
    }
    const signature = await signSpendPermission(spendPermission);
    if (!signature) {
      console.warn("Spend Permission not signed");
      return;
    }
    setSpendPermission(spendPermission);
    setSignature(signature);
  }

  async function authorizeUsdcPayment() {
    if (!spendPermission) {
      console.error("Must have valid spendPermission to authorize");
      return;
    }
    if (!signature) {
      console.error("Must have valid signature to authorize");
      return;
    }
    console.log("authorizing");

    const res = await fetch("/authorize", {
      method: "POST",
      body: JSON.stringify(
        { spendPermission, signature },
        (_: string, value: any) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        }
      ),
    });
    if (res.status == 200) {
      setAuthorized(true);
    }

    console.log(res);
    console.log(await res.json());
  }

  async function captureUsdcPayment() {
    if (!authorized) {
      console.error("Must be authorized to capture");
      return;
    }
    if (!spendPermission) {
      console.error("Must have valid spendPermission to authorize");
      return;
    }
    console.log("capturing");

    const res = await fetch("/capture", {
      method: "POST",
      body: JSON.stringify({ spendPermission }, (_: string, value: any) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      }),
    });

    console.log(res);
    console.log(await res.json());
  }

  return {
    spendPermission,
    signature,
    authorized,
    requestUsdcPayment,
    authorizeUsdcPayment,
    captureUsdcPayment,
  };
}

function useSpendPermission({ useApiAccount }: { useApiAccount?: boolean }) {
  const { connectors, connectAsync } = useConnect();
  const account = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();

  async function signSpendPermission(spendPermission: SpendPermission) {
    console.log({ spendPermission });
    console.log("signing");

    if (useApiAccount) {
      const res = await fetch("/sign", {
        method: "POST",
        body: JSON.stringify({ spendPermission }, (_: string, value: any) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        }),
      });
      const json = await res.json();
      return json.signature;
    }

    let accountAddress = account?.address;
    if (!accountAddress) {
      if (spendPermission.account !== zeroAddress) {
        console.error("Address is not connected");
        return undefined;
      }
      try {
        const requestAccounts = await connectAsync({
          connector: connectors[0],
        });
        accountAddress = requestAccounts.accounts[0];
        spendPermission = { ...spendPermission, account: accountAddress };
      } catch {
        return;
      }
    }
    try {
      const signature = await signTypedDataAsync(
        prepareTypedData({ chainId, spendPermission })
      );
      return signature;
    } catch (e) {
      console.error(e);
    }
  }

  return { signSpendPermission };
}
