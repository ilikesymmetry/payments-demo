import { createWalletClient, Hex, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export const operatorKey = privateKeyToAccount(
  process.env.OPERATOR_PRIVATE_KEY as Hex
);

export const operatorClient = createWalletClient({
  account: operatorKey,
  chain: baseSepolia,
  transport: http(),
});
