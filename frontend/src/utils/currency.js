export function formatMoney(value, symbol = '$') {
  const n = Number(value) || 0;
  return `${symbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
