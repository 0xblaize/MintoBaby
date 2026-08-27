// Utility to manage user's single activation code (1 per person)
// Used to activate both Telegram Bot and CLI Terminal

const STORAGE_KEY = 'mintobaby_user_activation_code';

export function generateActivationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () => {
    let res = '';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `MINTO-${segment()}-${segment()}-${segment()}`;
}

export function getUserActivationCode(): string {
  let code = localStorage.getItem(STORAGE_KEY);
  if (!code) {
    code = generateActivationCode();
    localStorage.setItem(STORAGE_KEY, code);
  }
  return code;
}

export function regenerateUserActivationCode(): string {
  const newCode = generateActivationCode();
  localStorage.setItem(STORAGE_KEY, newCode);
  return newCode;
}

export interface ActivationStatus {
  webConsole: boolean;
  telegramBot: boolean;
  cliTerminal: boolean;
  code: string;
  activatedAt: string;
}

export function getUserActivationDetails(): ActivationStatus {
  const code = getUserActivationCode();
  return {
    webConsole: true,
    telegramBot: true,
    cliTerminal: true,
    code,
    activatedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };
}
