import { Address, zeroAddress } from "viem";

export const PAYMENT_ESCROW =
  "0x1901D7DFb5614F85D805C3adb987dB566B1d40Ed" as Address;
export const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;
export const SPEND_PERMISSION_MANAGER =
  "0xf85210B21cC50302F477BA56686d2019dC9b67Ad" as Address;
export const OPERATOR = "0x2B654aB28f82a2a4E4F6DB8e20791E5AcF4125c6" as Address;
export const API_ACCOUNT =
  "0x9D782c3fBCd5217F27D6454C49861c5A63C9FDd2" as Address;
export const MERCHANT = zeroAddress; // TODO fill in
export const FEE_BPS = 100;
export const FEE_RECIPIENT = OPERATOR;
export const MAX_UINT48 = 281474976710655;
export const NON_REPEATING_PERIOD = 281474976672000; // max uint48 rounded to units of days
