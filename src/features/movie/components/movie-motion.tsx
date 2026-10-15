"use client";

import { Count } from "../stage";
import { formatMoney } from "../lib/utils";

export function MoneyCount({ since, value }: { since: number; value: number }) {
  return (
    <Count
      since={since}
      format={(amount) => formatMoney(amount) ?? "$0"}
      hover
      value={value}
    />
  );
}
