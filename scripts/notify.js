const apiUrl = process.env.NOTIFICATION_API_URL || 'http://localhost:3000/api/notifications'
const action = process.env.NOTIFICATION_ACTION || 'trigger'
const force = process.env.NOTIFICATION_FORCE === 'true'

async function run() {
  try {
    console.log(`Calling notifications API: ${apiUrl}`)
    const body = {
      action,
      ...(action === 'trigger' ? { force } : {}),
      ...(action === 'test' && process.env.NOTIFICATION_CHAT_ID ? { telegram_chat_id: process.env.NOTIFICATION_CHAT_ID } : {}),
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Notification API returned error:', data)
      process.exit(1)
    }

    console.log('Notification API response:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Failed to call notification API:', error)
    process.exit(1)
  }
}

run()
