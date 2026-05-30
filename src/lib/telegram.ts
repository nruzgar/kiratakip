import { Database } from '@/types/database'

export async function sendTelegramMessage(chatId: string, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN ortam değişkeni tanımlı değil.')
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  })

  const payload = await response.json()

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.description || 'Telegram mesajı gönderilemedi.')
  }

  return payload
}
