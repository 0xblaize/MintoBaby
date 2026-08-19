function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export function formatEventNotification(input: { eventName: string; address: string; blockNumber: bigint; txHash: string; args: unknown; explorerBaseUrl: string }): string {
  const args = escapeHtml(JSON.stringify(input.args, (_, value) => typeof value === 'bigint' ? value.toString() : value));
  const txUrl = `${input.explorerBaseUrl}/tx/${input.txHash}`;
  return `<b>${escapeHtml(input.eventName)}</b> detected\nContract: <code>${escapeHtml(input.address)}</code>\nBlock: <code>${input.blockNumber}</code>\n<a href="${escapeHtml(txUrl)}">View transaction</a>\nArguments: <code>${args}</code>\n\nRead-only notification; no transaction was submitted.`;
}
