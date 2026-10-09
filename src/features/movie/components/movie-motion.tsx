"use client";

import { Count } from "../stage";
import { formatMoney } from "../lib/utils";

export function MoneyCount({ at, value }: { at: number; value: number }) {
  return (
    <Count
      at={at}
      format={(amount) => formatMoney(amount) ?? "$0"}
      hover
      value={value}
    />
  );
}
