import cron from 'node-cron'
import Social from './models/socialModel.js'
import SocialParticipant from './models/socialParticipantModel.js'
import User from './models/userModel.js'
import Venue from './models/venueModel.js'
import { trusted } from 'mongoose'
import { socialNotifications, qrcodeNotifications } from './controllers/notificationController.js'
import { generateQrCodeDataUrl } from './utils/qrCodeGenerator.js'

const setupCronJobs = () => {
  // 定義一個每分鐘檢查一次的 Cron Job (實際生產中可能設為每 5-10 分鐘)
  // 分 時 日 月 星期
  // 每分鐘執行一次：* * * * *
  // 每 5 分鐘執行一次： */5 * * * *
  // 每天凌晨 3 點 0 分執行一次： 0 3 * * *
  // 每週一上午 9 點 0 分執行一次： 0 9 * * 1
  cron.schedule('10 * * * *', async () => {
    console.log(`--- Cron Job 正在執行 (${new Date().toLocaleString()}) ---`)

    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000) // 現在起一小時後

    try {
      await socialNotifications()

      // 處理一天前的場次資訊通知
      const upcomingSocials = await Social.find({
        startDateTime: trusted({ $gte: now, $lte: oneHourFromNow }),
        qrCodeGenerated: false,
        qrCodeNotificationSent: false,
        isCanceled: false,
      })
        .populate({
          path: 'host',
          select: 'name email line_uid',
        })
        .populate({
          path: 'venue',
          select: 'name city address',
        })

      for (const social of upcomingSocials) {
        // 或者更安全的方式，讓前端呼叫 API 獲取簽到數據，再由前端生成 QR Code。
        // 這裡您可以選擇將 qrCodeDataUrl 存儲到資料庫或雲端存儲，以便主揪獲取
        // 目前的設計是前端在主揪頁面即時生成，所以這裡主要用於觸發通知
        // 生成 QR Code Data URL (此 Data URL 需要透過前端請求 API 獲取，此處僅模擬生成行為)
        const checkinUrl = `${process.env.API_DOMAIN}/api/socials/${social._id}/checkin`
        const qrCodeDataUrl = await generateQrCodeDataUrl(checkinUrl)

        console.log(`生成 QR Code 提醒 for Social: ${social.startDateTime} (ID: ${social._id})`)

        // 更新場次狀態，標記 QR Code 已生成，避免重複生成
        await Social.findByIdAndUpdate(social._id, {
          qrCodeGenerated: true,
          qrCodeNotificationSent: true,
        })

        const social = await Social.findById(social._id).populate({
          path: 'host',
          select: 'name line_uid google_uid email',
        })

        if (social && social.host) {
          console.log(
            `主揪 ${social.host.name} 的聯絡方式：
            Email: ${social.host.email ? social.host.email : '無主揪的 email 資訊'},
            line ID: ${social.host.line_uid ? social.host.line_uid : '無主揪的 line ID'}`,
          )
        }
        await qrcodeNotifications(social)
      }

      // 處理 qrcode 生成及主揪通知

      // 處理結束時間後的狀態更新 (未簽到自動設為缺席)
      const anHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const endedSocials = await Social.find({
        endDateTime: trusted({ $lte: anHourAgo }),
        attendanceFinalized: false, // 假設有欄位標記考勤是否已結算
      }).select('_id')

      for (const social of endedSocials) {
        console.log(`處理考勤結算 for Social: ${social._id}`)
        // 查找所有已報名但未簽到的參與者
        const unCheckedInParticipants = await SocialParticipant.find({
          social: social._id,
          // 已報名或已遞補但未掃碼的球員，已掃碼的球員狀態皆已變成「出席」
          status: { $in: ['已報名', '已遞補'] },
        })

        for (const participant of unCheckedInParticipants) {
          participant.status = '缺席'
          await participant.save()

          // 更新用戶的 attendanceTotal 和 attendanceRate
          const participantUser = await User.findById(participant.user)
          if (participantUser) {
            participantUser.attendanceTotal = (participantUser.attendanceTotal || 0) + 1
            participantUser.attendanceRate =
              participantUser.attendanceTotal > 0
                ? participantUser.attendancePresent / participantUser.attendanceTotal
                : 0
            await participantUser.save()
          }
        }
        await Social.findByIdAndUpdate(social._id, { attendanceFinalized: true })
      }
    } catch (error) {
      console.error('Cron Job Error:', error)
    }
  })
  console.log('Cron Jobs setup completed.')
}

export default setupCronJobs
