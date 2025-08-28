import Social from '../models/socialModel.js'
import SocialParticipant from '../models/socialParticipantModel.js'
import { sendEmail } from '../utils/emailNotice.js'
import { sendLineMessage } from '../utils/lineNotice.js'
import { trusted } from 'mongoose'

// 用於在通知中格式化日期時間
const formatDateTime = (date) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  }
  return new Date(date).toLocaleString('zh-TW', options)
}

export const socialNotifications = async () => {
  console.log('--- Running sendUpcomingSocialNotifications cron job ---')
  const now = new Date()
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000
  const fiveMinutesInMs = 5 * 60 * 1000
  const oneDayFromNow = new Date(now.getTime() + twentyFourHoursInMs)
  const oneDayFiveMinutesFromNow = new Date(oneDayFromNow.getTime() + fiveMinutesInMs)

  try {
    const upcomingSocials = await Social.find({
      startAt: trusted({ $gte: oneDayFromNow, $lte: oneDayFiveMinutesFromNow }),
      socialNotificationSent: { $ne: true },
      isCanceled: false,
    })
      .populate({
        path: 'host',
        select: 'name email lineId',
      })
      .populate({
        path: 'venue',
        select: 'name city address trafficInfo',
      })

    for (const social of upcomingSocials) {
      console.log(
        `Sending notifications for social: ${social.venue} starting at ${formatDateTime(social.startAt)}`,
      )

      // 通知所有已報名球員
      const participants = await SocialParticipant.find({
        social: social._id,
        status: { $in: ['已報名', '已遞補'] },
      }).populate({
        path: 'user',
        select: 'name email lineId',
      })

      for (const participant of participants) {
        if (!participant.user) {
          continue
        }

        const emailSubject = ` 準備開打！${social.venue} ${formatDateTime(social.startAt)} 的場次等你一起來打球！`
        const emailContent = `
          <p>嗨！ ${participant.user.name}，準備好了嗎？</p>
          <p>你報名的 play 場次就在 **${social.venue}**，時間是 ** ${formatDateTime(social.startAt)}** ，明天記得準時出現，不見不散！</p>
          <p>場次資訊一次看：</p>
          <p><strong>球場：</strong> ${social.venue ? social.venue.name : '未知球場'}</p>
          <p><strong>地址：</strong> ${social.venue ? social.venue.city : '未知城市'}${social.venue ? social.venue.address : '未知地址'}</p>
          <p><strong>主揪：</strong> ${social.host ? social.host.name : '未知'}</p>
          <p>交通及停車資訊： ${social.venue ? social.venue.trafficInfo : '無交通或停車資訊'}</p>
          <p>熱身準備一下，我們球場見！</p>
          <p>（此為系統自動發送，請勿直接回覆。）</p>
        `
        const lineContent = `
          嗨！ ${participant.user.name}，準備好了嗎？
          你報名的 play 場次就在 **${social.venue}**，時間是 ** ${formatDateTime(social.startAt)}**，明天記得準時出現，不見不散！
          場次資訊一次看：
          球場：${social.venue ? social.venue.name : '未知球場'}
          地址：${social.venue ? social.venue.city : '未知縣市'} ${social.venue ? social.venue.address : '未知地址'}
          主揪：${social.host ? social.host.name : '未知主揪'}
          熱身準備一下，我們球場見！
          交通及停車資訊： ${social.venue ? social.venue.trafficInfo : '無交通或停車資訊'}
          (此為 Line Bot 通知，請勿直接回覆)
        `

        // 根據使用者的 lineId 存在性選擇通知管道
        if (participant.user.lineId) {
          // 發送 Line Bot 推播訊息，Line User ID 必須是您的 Bot 的好友
          await sendLineMessage(participant.user.lineId, lineContent)
        } else if (participant.user.email) {
          await sendEmail(participant.user.email, emailSubject, emailContent)
        } else {
          console.warn(
            `User ${participant.user.name} (ID: ${participant.user._id}) has no Line ID or Email. Cannot send notification.`,
          )
        }
      }

      // 2. 通知主揪 (邏輯與球員通知類似)
      if (social.host) {
        const hostEmailSubject = `場次提醒！你在 ${social.venue} 主揪的場次即將在明天開打囉！`
        const hostEmailContent = `
            <p>哈囉 ${social.host.name}~</p>
            <p>你在 **${social.venue}** 發起的 play 場次將在 **${formatDateTime(social.startAt)}** 準時開打，請準備好一顆期待心迎接大家一起開心打球！</p>
            <p><strong>球場：</strong> ${social.venue ? social.venue.name : '未知球場'}</p>
            <p><strong>地址：</strong> ${social.venue ? social.venue.city : '未知城市'}${social.venue ? social.venue.address : '未知地址'}</p>
            <p>交通及停車資訊： ${social.venue ? social.venue.trafficInfo : '無交通或停車資訊'}</p>
            <p>有狀況隨時跟球員們聯繫喔～祝你明天的場次超順利、超好玩！</p>
            <p>此為系統自動發送，請勿直接回覆。</p>
          `
        const hostLineContent = `
            哈囉 ${social.host.name}~ 你在 **${social.venue}** 發起的 play 場次將在 **${formatDateTime(social.startAt)}** 準時開打，請準備好一顆期待心迎接大家一起開心打球！
            球場：${social.venue ? social.venue.name : '未知球場'}
            地址：${social.venue ? social.venue.city : '未知縣市'} ${social.venue ? social.venue.address : '未知地址'}
            交通及停車資訊： ${social.venue ? social.venue.trafficInfo : '無交通或停車資訊'}
            有狀況隨時跟球員們聯繫喔～祝你明天的場次超順利、超好玩！
            (此為 Line Bot 通知，請勿直接回覆)
          `

        if (social.host.lineId) {
          await sendLineMessage(social.host.lineId, hostLineContent)
        } else if (social.host.email) {
          await sendEmail(social.host.email, hostEmailSubject, hostEmailContent)
        } else {
          console.warn(
            `Host ${social.host.name} (ID: ${social.host._id}) has no Line ID or Email. Cannot send host notification.`,
          )
        }
      }

      // 3. 更新 Social 狀態，標記通知已發送
      await Social.findByIdAndUpdate(social._id, { socialNotificationSent: true })
    }
  } catch (error) {
    console.error('Error in sendUpcomingSocialNotifications cron job:', error)
  }
}

export const qrcodeNotifications = async () => {
  console.log('--- Running sendQrcodeGeneratedNotifications cron job ---')
  try {
    const qrcodeGeneratedSocials = await Social.find({
      isCanceled: false,
    })
      .populate({
        path: 'host',
        select: 'name email line_uid',
      })
      .populate({
        path: 'venue',
        select: 'name',
      })

    for (const social of qrcodeGeneratedSocials) {
      console.log(
        `Sending notifications for social: ${social.venue} ${formatDateTime(social.startAt)} QRcode generated`,
      )

      const emailSubject = ` 場次倒數！你在 ${social.venue} 主揪的 ${formatDateTime(social.startAt)} 場次 QRcode 出爐啦！`
      const emailContent = `
          <p>嗨~ ${social.host.name}!</p>
          <p>你主揪的 <strong>${formatDateTime(social.startAt)}</strong> 場次（地點：<strong>${social.venue}</strong>）的 QRcode 已經準備好啦，快讓球員們登入網站後掃描出席吧！</p>
          <p><strong>記得！</strong>掃描登記時間是 <strong>開打前1小時</strong> 到 <strong>結束後1小時</strong>，錯過時間 QRcode 就無效啦～</p>
          <p>P.S. 萬一有人忘了掃描也別慌，主揪可以在本場次的球員名單頁手動補登唷！</p>
          <p>祝你場次順利、大家打得超開心啦～</p>
          <p>（此為系統自動發送，請勿直接回覆。）</p>
        `
      const lineContent = `
          嗨~ ${social.host.name}，你的場次準備開打啦！
          你在 ${social.venue} 主揪的 ${formatDateTime(social.startAt)} 場次 QRcode 已出爐，請提醒球員登入網站後掃描 QRcode 來登記出席！
          掃描時間是「開打前1小時」到「結束後1小時」內，超過 QRcode 就失效囉～
          P.S. 如果有球員忘記掃碼，主揪也可以到場次球員名單頁進行補登
          祝福這場打得精彩又順利！
          (此為 Line Bot 通知，請勿直接回覆)
        `

      if (social.host.line_uid) {
        await sendLineMessage(social.host.line_uid, lineContent)
      } else if (social.host.email) {
        await sendEmail(social.host.email, emailSubject, emailContent)
      } else {
        console.warn(
          `Host ${social.host.name} (ID: ${social.host._id}) has no Line ID or Email. Cannot send host notification.`,
        )
      }
    }
  } catch (error) {
    console.error('Error in sendQrcodeGeneratedNotifications cron job:', error)
  }
}
