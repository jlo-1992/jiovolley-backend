import dotenv from 'dotenv'
import { Client } from '@line/bot-sdk'

dotenv.config()

const config = {
  channelAccessToken: process.env.MESSAGING_LINE_ACCESS_TOKEN,
  channelSecret: process.env.MESSAGING_LINE_CHANNEL_SECRET,
}

const client = new Client(config)

/**
 * 發送 Line 推播訊息 (Push Message) 給單一使用者。
 *
 * @param {string} toLineId - 接收訊息的 Line User ID (必須是您的 Line Bot 好友)。
 * @param {string} messageText - 訊息的純文字內容。
 * @returns {Promise<boolean>} - 如果訊息成功發送，返回 true；否則返回 false。
 */
const sendLineMessage = async (toLineId, messageText) => {
  try {
    // 構建訊息物件陣列，這裡只發送一個文字訊息
    const messages = [{ type: 'text', text: messageText }]

    // 使用 Line Bot SDK 的 pushMessage 方法
    const response = await client.pushMessage(toLineId, messages)

    console.log(`Line message sent to ${toLineId}:`, response)
    return true
  } catch (error) {
    console.error(
      `Error sending Line message to ${toLineId}:`,
      error.originalError ? error.originalError.response.data : error.message,
    )
    // 處理錯誤：例如，如果 Line User ID 無效或用戶封鎖了 Bot
    if (
      error.originalError &&
      error.originalError.response &&
      error.originalError.response.status === 400
    ) {
      // Line API 返回 400 通常表示 toLineId 無效或用戶未加 Bot 好友
      console.error(
        `[Line Push Error] Invalid userId or user not befriended the bot for ${toLineId}.`,
      )
    }
    return false
  }
}

export { sendLineMessage }
