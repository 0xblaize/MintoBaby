export type TelegramButton = {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
};
export type TelegramUpdate = {
  update_id: number;
  message?: { chat: { id: number }; from?: { id: number }; text?: string };
  callback_query?: { id: string; from: { id: number; username?: string }; message?: { message_id?: number; chat: { id: number } }; data?: string };
};

export class TelegramClient {
  constructor(private readonly token: string) {}

  async sendMessage(chatId: string | number, text: string, buttons?: TelegramButton[][]): Promise<void> {
    try {
      const sanitizedButtons = buttons?.map(row =>
        row.map(btn => ({
          ...btn,
          callback_data: btn.callback_data ? btn.callback_data.slice(0, 64) : undefined
        }))
      );

      const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: sanitizedButtons && sanitizedButtons.length > 0 ? { inline_keyboard: sanitizedButtons } : undefined
        }),
        signal: AbortSignal.timeout(10_000)
      });
      const body = await response.json() as { ok?: boolean; description?: string };
      if (!response.ok || !body.ok) {
        console.warn(`Telegram send failed (${body.description}), trying fallback plain text...`);
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: cleanText,
            reply_markup: sanitizedButtons && sanitizedButtons.length > 0 ? { inline_keyboard: sanitizedButtons } : undefined
          }),
          signal: AbortSignal.timeout(10_000)
        });
      }
    } catch (err) {
      console.error('Telegram sendMessage error:', err);
    }
  }

  async editMessageText(chatId: string | number, messageId: number, text: string, buttons?: TelegramButton[][]): Promise<void> {
    try {
      const sanitizedButtons = buttons?.map(row =>
        row.map(btn => ({
          ...btn,
          callback_data: btn.callback_data ? btn.callback_data.slice(0, 64) : undefined
        }))
      );

      const response = await fetch(`https://api.telegram.org/bot${this.token}/editMessageText`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: sanitizedButtons && sanitizedButtons.length > 0 ? { inline_keyboard: sanitizedButtons } : undefined
        }),
        signal: AbortSignal.timeout(10_000)
      });
      const body = await response.json() as { ok?: boolean; description?: string };
      if (!response.ok || !body.ok) {
        if (body.description && !body.description.includes('message is not modified')) {
          await this.sendMessage(chatId, text, buttons);
        }
      }
    } catch {
      await this.sendMessage(chatId, text, buttons);
    }
  }

  async answerCallbackQuery(callbackQueryId: string): Promise<void> {
    await fetch(`https://api.telegram.org/bot${this.token}/answerCallbackQuery`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callback_query_id: callbackQueryId }) });
  }

  async deleteWebhook(dropPendingUpdates = false): Promise<void> {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: dropPendingUpdates }),
      signal: AbortSignal.timeout(10_000)
    });
    const body = await response.json() as { ok?: boolean; description?: string };
    if (!response.ok || !body.ok) throw new Error(`Telegram deleteWebhook failed: ${body.description ?? response.statusText}`);
  }

  async getUpdates(offset: number): Promise<TelegramUpdate[]> {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/getUpdates?timeout=20&offset=${offset}`, {
      signal: AbortSignal.timeout(30_000)
    });
    const body = await response.json() as { ok?: boolean; result?: TelegramUpdate[]; description?: string };
    if (!response.ok || !body.ok) throw new Error(`Telegram polling failed: ${body.description ?? response.statusText}`);
    return body.result ?? [];
  }

  async setMyCommands(commands: { command: string; description: string }[]): Promise<void> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.token}/setMyCommands`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commands }),
        signal: AbortSignal.timeout(10_000)
      });
      const body = await response.json() as { ok?: boolean; description?: string };
      if (!response.ok || !body.ok) {
        console.warn(`Telegram setMyCommands notice: ${body.description ?? response.statusText}`);
      }
    } catch (err) {
      console.warn('Failed to set Telegram commands:', err);
    }
  }

  async setWebhook(url: string): Promise<boolean> {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/setWebhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, drop_pending_updates: true }),
      signal: AbortSignal.timeout(10_000)
    });
    const body = await response.json() as { ok?: boolean; description?: string };
    if (!response.ok || !body.ok) throw new Error(`Telegram setWebhook failed: ${body.description ?? response.statusText}`);
    return true;
  }
}
