import { useState } from "react";
import { Address, decodeAbiParameters, Hex, zeroAddress } from "viem";
import { useConnect, useAccount, useSignTypedData, useChainId } from "wagmi";
import { prepareTypedData, prepareUsdcPayment, Authorization } from "./utils";
import { API_ACCOUNT } from "./constants";

export function useBasePay(args?: { useApiAccount?: boolean }) {
  const account = useAccount();
  const chainId = useChainId();
  const { signPayment } = useSignPayment({
    useApiAccount: args?.useApiAccount,
  });
  const [authorization, setAuthorization] = useState<Authorization>();
  const [paymentDetails, setPaymentDetails] = useState<any>();
  const [signature, setSignature] = useState<Hex>();
  const [authorizationTxHash, setAuthorizationTxHash] = useState<Hex>();
  const [captureTxHash, setCaptureTxHash] = useState<Hex>();

  async function requestUsdcPayment({
    usdAmount,
    operator,
    receiver,
    feeBps,
    feeReceiver,
    expiresAt,
  }: {
    usdAmount: number;
    operator: Address;
    receiver: Address;
    feeBps: number;
    feeReceiver: Address;
    expiresAt: number; // unix seconds
  }) {
    let { authorization, paymentDetails } = prepareUsdcPayment({
      chainId,
      account: account.address ?? zeroAddress,
      usdAmount,
      operator,
      receiver,
      feeBps,
      feeReceiver,
      expiresAt,
    });

    if (args?.useApiAccount) {
      authorization.from = API_ACCOUNT;
    }
    const signature = await signPayment(authorization);
    if (!signature) {
      console.warn("Spend Permission not signed");
      return;
    }
    console.log({ signature });
    setAuthorization(authorization);
    setPaymentDetails(paymentDetails);
    setSignature(signature);
  }

  async function authorizeUsdcPayment() {
    if (!authorization) {
      console.error("Must have valid authorization to authorize");
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
        { authorization, paymentDetails, signature },
        (_: string, value: any) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        }
      ),
    });

    console.log(res);
    if (res.status == 200) {
      const json = await res.json();
      setAuthorizationTxHash(json.txHash);
    }
  }

  async function captureUsdcPayment() {
    if (!authorizationTxHash) {
      console.error("Must be authorized to capture");
      return;
    }
    if (!authorization) {
      console.error("Must have valid authorization to authorize");
      return;
    }
    console.log("capturing");

    const res = await fetch("/capture", {
      method: "POST",
      body: JSON.stringify(
        { authorization, paymentDetails },
        (_: string, value: any) => {
          if (typeof value === "bigint") {
            return value.toString();
          }
          return value;
        }
      ),
    });

    console.log(res);
    if (res.status == 200) {
      const json = await res.json();
      setCaptureTxHash(json.txHash);
    }
  }

  return {
    authorization,
    paymentDetails,
    signature,
    authorizationTxHash,
    captureTxHash,
    requestUsdcPayment,
    authorizeUsdcPayment,
    captureUsdcPayment,
  };
}

function useSignPayment({ useApiAccount }: { useApiAccount?: boolean }) {
  const { connectors, connectAsync } = useConnect();
  const account = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();

  async function signPayment(authorization: Authorization) {
    console.log({ authorization });
    console.log("signing");

    if (useApiAccount) {
      const res = await fetch("/sign", {
        method: "POST",
        body: JSON.stringify({ authorization }, (_: string, value: any) => {
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
      if (authorization.from !== zeroAddress) {
        console.error("Address is not connected");
        return undefined;
      }
      try {
        const requestAccounts = await connectAsync({
          connector: connectors[0],
        });
        accountAddress = requestAccounts.accounts[0];
        authorization = { ...authorization, from: accountAddress };
      } catch {
        return;
      }
    }
    try {
      const typedData = prepareTypedData({ chainId, authorization });
      console.log({ typedData });
      const signature = await signTypedDataAsync(typedData);
      return signature;
    } catch (e) {
      console.error(e);
    }
  }

  return { signPayment };
}
