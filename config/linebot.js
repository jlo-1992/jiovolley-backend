import linebot from 'linebot'
import dotenv from 'dotenv'

dotenv.config()
const bot = linebot({
  channelId: process.env.MESSAGING_LINE_CHANNEL_ID,
  channelSecret: process.env.MESSAGING_LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.MESSAGING_LINE_ACCESS_TOKEN,
})

const linebotParser = bot.parser()

export { linebotParser, bot }
