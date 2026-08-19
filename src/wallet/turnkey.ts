import { Turnkey } from '@turnkey/sdk-server';
import type { Config } from '../config.js';

export type WalletCreationResult =
  | { success: true; address: string; walletId: string }
  | { success: false; error: string };

function createTurnkeyClient(config: Config) {
  return new Turnkey({
    apiBaseUrl: config.turnkey.apiBaseUrl,
    apiPublicKey: config.turnkey.apiPublicKey!,
    apiPrivateKey: config.turnkey.apiPrivateKey!,
    defaultOrganizationId: config.turnkey.organizationId!
  });
}

export async function createSafeBotWallet(telegramUserId: string, config: Config): Promise<WalletCreationResult> {
  if (!config.turnkey.enabled) {
    return { success: false, error: 'Turnkey support is not configured' };
  }

  try {
    const client = createTurnkeyClient(config).apiClient();

    const response = await client.createWallet({
      walletName: `Telegram-User-${telegramUserId}`,
      accounts: [
        {
          curve: 'CURVE_SECP256K1',
          pathFormat: 'PATH_FORMAT_BIP32',
          path: "m/44'/60'/0'/0/0",
          addressFormat: 'ADDRESS_FORMAT_ETHEREUM'
        }
      ]
    });

    const address = response.addresses?.[0];
    const walletId = response.walletId;
    if (!address || !walletId) {
      throw new Error('Turnkey response was missing the wallet address or wallet ID');
    }

    return { success: true, address, walletId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
