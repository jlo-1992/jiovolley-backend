import SocialParticipant from '../models/socialParticipantModel.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
import Social from '../models/socialModel.js'
import { trusted } from 'mongoose'
import User from '../models/userModel.js'

// 會員本人建立報名
export const create = async (req, res) => {
  let socialParticipant = null
  try {
    const socialId = req.params.socialId
    const userId = req.user._id

    if (!validator.isMongoId(socialId)) {
      throw new Error('SOCIAL ID INVALID')
    }

    const socialTarget = await Social.findById(socialId)
    if (!socialTarget) {
      throw new Error('SOCIAL NOT FOUND')
    }

    const now = new Date()
    if (socialTarget.startDateTime <= now) {
      throw new Error('SOCIAL EXPIRED')
    }

    const existingParticipant = await SocialParticipant.findOne({
      social: socialId,
      user: userId,
      $or: [{ status: '已報名' }, { status: '候補中' }, { status: '已遞補' }],
    })

    if (existingParticipant) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '您已報名過該場次，請勿重複報名。',
      })
    }

    let action = {}
    let message = ''

    const userGender = req.user.gender
    let participantStatus = ''

    if (userGender === 'female' || userGender === '女性') {
      if (socialTarget.demandFemalePlayers > 0) {
        action = { $inc: { demandFemalePlayers: -1, currentFemalePlayers: 1 } }
        message = '您已報名成功！'
        participantStatus = '已報名'
      } else {
        message = '已為您登記候補，補上會再通知您！'
        participantStatus = '候補中'
        // 如果要用 socialTarget.waitingList.push()，後面需要加上 socialTarget.save()，
        await Social.findByIdAndUpdate(socialId, {
          $push: {
            waitingList: {
              user: userId,
              gender: userGender,
              joinedAt: new Date(),
            },
          },
        })
      }
    } else if (userGender === 'male' || userGender === '男性') {
      if (socialTarget.demandMalePlayers > 0) {
        action = { $inc: { demandMalePlayers: -1, currentMalePlayers: 1 } }
        message = '您已報名成功！'
        participantStatus = '已報名'
      } else {
        message = '已為您登記候補，補上會再通知您！'
        participantStatus = '候補中'
        await Social.findByIdAndUpdate(socialId, {
          $push: {
            waitingList: {
              user: userId,
              gender: userGender,
              joinedAt: new Date(),
            },
          },
        })
      }
    } else {
      message = '資格不符，報名失敗。'
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: message,
      })
    }

    if (Object.keys(action).length > 0) {
      // 只有在有實際名額變動時才更新
      await Social.findByIdAndUpdate(socialId, action, { new: true, runValidators: true })
    }

    socialParticipant = await SocialParticipant.create({
      social: socialId,
      user: userId,
      status: participantStatus,
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: message,
      socialParticipant,
    })
  } catch (error) {
    console.error('Error in controllers/socialParticipantController.js create', error)
    if (error.message === 'SOCIAL ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的場次 ID',
      })
    } else if (error.message === 'SOCIAL NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '場次不存在',
      })
    } else if (error.message === 'SOCIAL EXPIRED') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '場次已結束，無法報名',
      })
    } else if (error.message === 'SOCIAL NOT AVAILABLE') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '該場次報名人數已滿。',
      })
    } else if (error.code === 11000) {
      // MongoDB duplicate key error code
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '您已報名過該場次，請勿重複報名。',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 尚未測試---------------------------------------
// 會員本人更改報名狀態
export const update = async (req, res) => {
  console.log('--- update function started ---')
  try {
    const socialId = req.params.socialId
    const userId = req.user._id
    const { status = '已報名' } = req.body
    const now = new Date()

    console.log('socialId:', socialId)
    console.log('userId:', userId)
    console.log('status from body:', status)
    console.log('status type:', typeof status)

    if (!validator.isMongoId(socialId)) {
      console.log('DEBUG: SOCIAL ID INVALID - returning BAD_REQUEST')
      throw new Error('SOCIAL ID INVALID')
    }

    const socialTarget = await Social.findById(socialId)
    console.log('DEBUG: After Social.findById(socialId)')
    console.log('SocialTarget:', socialTarget)
    if (!socialTarget) {
      console.log('DEBUG: SOCIAL NOT FOUND - returning NOT_FOUND')
      throw new Error('SOCIAL NOT FOUND')
    }

    if (!socialTarget.startDateTime) {
      console.log('DEBUG: Activity start time not set - returning BAD_REQUEST')
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '活動開始時間未設定，無法計算取消期限。',
      })
    }

    const deadline = new Date(socialTarget.startDateTime.getTime() - 12 * 60 * 60 * 1000)

    // 12 小時前停止更改報名狀態
    if (now > deadline) {
      console.log('DEBUG: TOO LATE TO CHANGE - returning BAD_REQUEST')
      throw new Error('TOO LATE TO CHANGE')
    }

    const participation = await SocialParticipant.findOne({
      social: socialId,
      user: userId,
      isCancelled: false,
    })

    if (!participation) {
      throw new Error('REGISTER NOT FOUND')
    }

    if (
      participation.status !== '已報名' &&
      participation.status !== '候補中' &&
      participation.status !== '已遞補'
    ) {
      throw new Error('REGISTER NOT FOUND') // 這裡可以拋出相同的錯誤，或者新的錯誤
    }

    participation.status = '已取消報名'
    participation.isCancelled = true
    participation.cancelledAt = now
    const updateStatus = await participation.save()

    // 取消報名後，更新場次資訊
    if (updateStatus.status === '已取消報名') {
      const userGender = req.user.gender
      let updateSocial = {}
      let waitingPlayer = null
      if (userGender === 'female') {
        updateSocial = { $inc: { demandFemalePlayers: 1, currentFemalePlayers: -1 } }
        waitingPlayer = socialTarget.waitingList
          .filter((wp) => wp.gender === 'female')
          .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0]
      } else if (userGender === 'male') {
        updateSocial = { $inc: { demandMalePlayers: 1, currentMalePlayers: -1 } }
        waitingPlayer = socialTarget.waitingList
          .filter((wp) => wp.gender === 'male')
          .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0]
      }

      if (Object.keys(updateSocial).length > 0) {
        await Social.findByIdAndUpdate(socialId, updateSocial, { new: true })
      }

      // 查詢遞補名單球員並執行遞補
      if (waitingPlayer) {
        const newPlayer = await SocialParticipant.findOneAndUpdate(
          {
            social: socialId,
            user: waitingPlayer.user,
            status: '候補中',
          },
          { status: '已遞補' },
          { new: true },
        )

        if (newPlayer) {
          let newAction = {}
          if (waitingPlayer.gender === 'female') {
            newAction = { $inc: { demandFemalePlayers: -1, currentFemalePlayers: 1 } }
          } else if (waitingPlayer.gender === 'male') {
            newAction = { $inc: { demandMalePlayers: -1, currentMalePlayers: 1 } }
          }
          await Social.findByIdAndUpdate(socialId, newAction)

          await Social.findByIdAndUpdate(socialId, {
            $pull: { waitingList: { user: newPlayer.user } },
          })
          console.log(
            `用戶 ${newPlayer.user} (性別: ${newPlayer.gender}) 已成功從候補名單遞補為已報名。`,
          )
        }
      }
    }
    res.status(StatusCodes.OK).json({
      success: true,
      message: '報名狀態更新成功',
      updateStatus,
    })
    console.log('--- update function finished successfully ---')
  } catch (error) {
    console.error('--- Inside Catch Block ---')
    console.error('Error in controllers/socialParticipantController.js update', error)
    if (error.message === 'SOCIAL ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的場次 ID',
      })
    } else if (error.message === 'SOCIAL NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '場次不存在',
      })
    } else if (error.message === 'TOO LATE TO CHANGE') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '已過取消報名期限，如臨時無法出席，請自行找人補。',
      })
    } else if (error.message === 'REGISTER NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到該場次的報名記錄或狀態不允許變更。',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，無法獲取會員資料',
      })
    }
  }
}

// 會員查詢自己已報名的場次
export const getMyParticipations = async (req, res) => {
  try {
    if (!req.user._id) {
      throw new Error('USER NOT FOUND')
    }

    let queryConditions = { user: req.user._id }
    const { status, time } = req.query
    const now = new Date()

    let socialMatchConditions = {}
    if (time) {
      if (time === 'upcoming') {
        socialMatchConditions.startDateTime = trusted({ $gt: now })
      } else if (time === 'past') {
        socialMatchConditions.startDateTime = trusted({ $lt: now })
      }
    }

    if (status) {
      queryConditions.status = status
    }

    const myParticipations = await SocialParticipant.find(queryConditions)
      .populate({
        path: 'social',
        match: socialMatchConditions,
        select:
          'name venue gender startDateTime endDateTime fee demandPlayers gender2 demandPlayers2 currentPlayers currentPlayers2 note skillLevel',
        populate: [
          {
            path: 'venue',
            select: 'name',
          },
          {
            path: 'host',
            select: 'name',
          },
        ],
      })
      .lean()
    const filteredParticipations = myParticipations.filter((p) => p.social !== null)

    res.status(StatusCodes.OK).json({
      success: true,
      message: '會員報名資料查詢成功',
      myParticipations: filteredParticipations,
    })
  } catch (error) {
    console.error('Error in controllers/socialParticipantController.js getMyParticipations', error)
    if (error.message === 'USER NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '請先登入會員以執行查詢功能',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 會員可查詢場次的球員名單
export const getParticipantsList = async (req, res) => {
  try {
    const socialId = req.params.socialId

    if (!validator.isMongoId(socialId)) {
      console.log('DEBUG: SOCIAL ID INVALID - returning BAD_REQUEST')
      throw new Error('SOCIAL ID INVALID')
    }
    const socialTarget = await Social.findById(socialId)

    // 檢查傳入的場次是否存在
    console.log('DEBUG: After Social.findById(socialId)')
    console.log('SocialTarget:', socialTarget)
    if (!socialTarget) {
      console.log('DEBUG: SOCIAL NOT FOUND - returning NOT_FOUND')
      throw new Error('SOCIAL NOT FOUND')
    }

    const participantsList = await SocialParticipant.find({ social: socialId })
      .populate({
        path: 'user',
        select:
          'name gender skillLevel line_uid email attendanceRate attendanceTotal attendancePresent',
      })
      .populate({
        path: 'social',
        select:
          'venue host startDateTime endDateTime fee skillLevel note demandFemalePlayers demandMalePlayers currentFemalePlayers currentMalePlayers waitingList',
      })
      .lean()

    res.status(StatusCodes.OK).json({
      success: true,
      message: '本場次球員名單查詢成功',
      participantsList,
    })
  } catch (error) {
    console.error('Error in controllers/socialParticipantController.js getAllHost', error)
    if (error.message === 'SOCIAL ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的場次 ID',
      })
    } else if (error.message === 'SOCIAL NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查詢的場次不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，無法查詢名單',
      })
    }
  }
}

// 主揪及管理員更改本場次球員報名狀態
export const updateHostAndAdmin = async (req, res) => {
  console.log('--- updateHost function started ---')
  try {
    const socialId = req.params.socialId
    const userId = req.user._id
    const userRole = req.user.role

    const participantId = req.params.participantId
    const { newStatus } = req.body

    console.log('socialId:', socialId)
    console.log('userId:', userId)
    console.log('participantId:', participantId)
    console.log('userRole:', userRole)
    console.log('newStatus from body:', newStatus)

    // 1. 優先檢查 ID 格式
    if (!validator.isMongoId(socialId)) {
      console.log('DEBUG: SOCIAL ID INVALID - returning BAD_REQUEST')
      throw new Error('SOCIAL ID INVALID')
    }

    if (!validator.isMongoId(participantId)) {
      console.log('DEBUG: PARTICIPANT ID INVALID - returning BAD_REQUEST')
      throw new Error('PARTICIPANT ID INVALID')
    }

    // 2. 查詢場次資訊
    const socialTarget = await Social.findById(socialId).select(
      'host startDateTime endDateTime demandFemalePlayers currentFemalePlayers demandMalePlayers currentMalePlayers waitingList',
    )

    console.log('DEBUG: After Social.findById(socialId)')
    console.log('SocialTarget:', socialTarget)

    if (!socialTarget) {
      console.log('DEBUG: SOCIAL NOT FOUND - returning NOT_FOUND')
      throw new Error('SOCIAL NOT FOUND')
    }

    const isHost = socialTarget.host.toString() === userId.toString()
    const isAdmin = userRole === 'admin'

    // 3. 驗證當前用戶是否是該場次的主揪
    if (!isHost && !isAdmin) {
      console.log('DEBUG: NOT THE HOST OR ADMIN - returning UNAUTHORIZED')
      throw new Error('NOT THE HOST OR ADMIN')
    }

    // 4. 查詢要更新的參與者記錄
    const participantTarget = await SocialParticipant.findById(participantId)

    console.log('DEBUG: After SocialParticipant.findById(participantId)')
    console.log('participantTarget:', participantTarget)

    if (!participantTarget) {
      console.log('DEBUG: PARTICIPANT NOT FOUND - returning NOT_FOUND')
      throw new Error('PARTICIPANT NOT FOUND')
    }

    // 確保該報名記錄屬於當前場次，避免跨場次操作
    if (participantTarget.social.toString() !== socialId.toString()) {
      console.log('DEBUG: PARTICIPANT NOT BELONG TO THIS SOCIAL ')
      throw new Error('PARTICIPANT NOT BELONG TO THIS SOCIAL')
    }

    // 獲取原始狀態以便計算人數變更
    const oldStatus = participantTarget.status

    // 5. 根據主揪提供的新狀態來更新
    let updateSocialAction = {}
    let message = ''

    // 獲取該參與者的資訊，以便更新
    const participantUser = await User.findById(participantTarget.user).select(
      'gender attendanceRate attendanceTotal attendancePresent',
    )
    if (!participantUser) {
      throw new Error('USER INFO NOT FOUND')
    }
    const participantGender = participantUser.gender
    let waitingPlayer = null

    // 依狀態轉換邏輯進行資料更新
    if (oldStatus === '已報名' && newStatus === '已取消報名') {
      participantTarget.status = newStatus
      participantTarget.isCancelled = true
      participantTarget.cancelledAt = new Date()
      if (participantGender === 'female') {
        updateSocialAction = { $inc: { demandFemalePlayers: 1, currentFemalePlayers: -1 } }
        waitingPlayer = socialTarget.waitingList
          .filter((wp) => wp.gender === 'female')
          .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0]
      } else if (participantGender === 'male') {
        updateSocialAction = { $inc: { demandMalePlayers: 1, currentMalePlayers: -1 } }
        waitingPlayer = socialTarget.waitingList
          .filter((wp) => wp.gender === 'male')
          .sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0]
      }

      // 從候補名單中遞補球員
      if (waitingPlayer) {
        const newPlayer = await SocialParticipant.findOneAndUpdate(
          {
            social: socialId,
            user: waitingPlayer.user,
            status: '候補中',
          },
          { status: '已遞補' },
          { new: true, runValidators: true },
        )

        if (newPlayer) {
          let newAction = {}
          if (waitingPlayer.gender === 'female') {
            newAction = { $inc: { demandFemalePlayers: -1, currentFemalePlayers: 1 } }
          } else if (waitingPlayer.gender === 'male') {
            newAction = { $inc: { demandMalePlayers: -1, currentMalePlayers: 1 } }
          }
          await Social.findByIdAndUpdate(socialId, newAction)

          await Social.findByIdAndUpdate(
            socialId,
            {
              $pull: { waitingList: { user: waitingPlayer.user } },
            },
            { new: true },
          )
          console.log(
            `用戶 ${waitingPlayer.user} (性別: ${waitingPlayer.gender}) 已成功從候補名單遞補為已報名。`,
          )
        } else {
          console.warn(
            `警告：嘗試遞補用戶 ${waitingPlayer.user} 失敗，可能其報名狀態非「排隊中」。`,
          )
        }
      }
      message = '球員的報名狀態已更改為「已取消報名」，並已更新球員名單。'
    } else if (oldStatus === '缺席' && newStatus === '已補登出席') {
      participantTarget.status = newStatus
      participantTarget.isOverrided = true
      participantTarget.overridedAt = new Date()
      message = '已將球員報名狀態更改為已補登出席，並更新出席率完成。'
      // 更改球員出席率
      participantUser.attendancePresent = (participantUser.attendancePresent || 0) + 1
      participantUser.attendanceRate =
        participantUser.attendanceTotal > 0
          ? participantUser.attendancePresent / participantUser.attendanceTotal
          : 0
      await participantUser.save({ runValidators: true })
    } else if (oldStatus === '候補中' && newStatus === '已取消報名') {
      participantTarget.status = newStatus
      participantTarget.isCancelled = true
      participantTarget.cancelledAt = new Date()
      message = '已將候補球員的狀態更改為已取消報名。'
      // 將球員從候補名單中刪除
      await Social.findByIdAndUpdate(
        socialId,
        {
          $pull: { waitingList: { user: participantTarget.user } },
        },
        { new: true },
      )
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的狀態轉換請求或狀態未改變。',
      })
    }

    // 6. 執行資料庫更新操作
    await participantTarget.save({ runValidators: true })
    if (Object.keys(updateSocialAction).length > 0) {
      await Social.findByIdAndUpdate(socialId, updateSocialAction, { new: true })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: message,
      updatedParticipant: participantTarget,
    })
  } catch (error) {
    console.error('Error in controllers/socialParticipantController.js updateHost', error)
    // 錯誤處理區塊，將所有錯誤統一在此處理
    if (error.message === 'SOCIAL ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的場次 ID',
      })
    } else if (error.message === 'PARTICIPANT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球員報名 ID',
      })
    } else if (error.message === 'SOCIAL NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查詢的場次不存在',
      })
    } else if (error.message === 'NOT THE HOST OR ADMIN') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: '只有主揪及管理員可以更改本場次球員的報名狀態',
      })
    } else if (error.message === 'PARTICIPANT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '查詢的用戶不存在',
      })
    } else if (error.message === 'PARTICIPANT NOT BELONG TO THIS SOCIAL') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '該球員不屬於此場次',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else if (error.name === 'USER INFO NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到該報名球員的用戶資料',
      })
    } else if (error.name === 'CastError') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '資料格式無效，請檢查 ID 或其他欄位格式。',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，無法更改球員狀態。',
      })
    }
  }
}

// 管理員查詢某個使用者所有的報名紀錄
export const getUserParticipantAdmin = async (req, res) => {
  try {
    // 驗證請求的使用者 ID
    if (!validator.isMongoId(req.params.userId)) {
      console.log('DEBUG: USER ID INVALID - returning BAD_REQUEST')
      throw new Error('USER ID INVALID')
    }

    const user = await User.findById(req.params.userId)
    if (!user) {
      console.log('DEBUG: USER NOT FOUND - returning NOT_FOUND')
      throw new Error('USER NOT FOUND')
    }

    const userTarget = await SocialParticipant.find({ user: req.params.userId })
      .populate({
        path: 'social',
        select: 'venue host skillLevel startDateTime',
        populate: [
          {
            path: 'venue',
            select: 'name',
          },
          {
            path: 'host',
            select: 'name',
          },
        ],
      })
      .sort({ createdAt: -1 })

    // 檢查查詢結果是否為空陣列
    // find() 查詢如果沒有匹配文檔，會返回 []，所以不能用 .Fail() 驗證
    // orFail() 通常用於 findOne()、findById() 這類期望返回單一文檔的查詢，當結果為 null 時觸發
    if (userTarget.length === 0) {
      console.log('DEBUG: NO PARTICIPATION FOUND - returning NOT_FOUND')
      throw new Error('NO PARTICIPATION FOUND')
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '取得此使用者的所有報名資訊成功',
      result: userTarget,
    })
  } catch (error) {
    console.error(
      'Error in controllers/socialParticipantController.js getUserParticipantAdmin',
      error,
    )
    if (error.message === 'USER ID INVALID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的使用者 ID',
      })
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '搜尋的使用者不存在',
      })
    } else if (error.message === 'NO PARTICIPATION FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者尚未建立任何報名紀錄',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// QR Code 掃描簽到路由
export const checkin = async (req, res) => {
  try {
    const socialId = req.params.socialId
    const userId = req.user._id

    if (!socialId || !validator.isMongoId(socialId)) {
      throw new Error('SOCIAL ID INVALID')
    }

    if (!userId || !validator.isMongoId(userId)) {
      throw new Error('MEMBER ONLY')
    }

    // 查找該用戶在該場次的報名記錄
    const participant = await SocialParticipant.findOne({
      social: socialId,
      user: userId,
      status: { $in: ['已報名', '已遞補'] },
    }).populate({ path: 'social', select: 'startDateTime endDateTime' })

    if (!participant) {
      throw new Error('NOT BELONG TO THE SOCIAL')
    }

    // 3. 只能在場次有效時間內簽到
    const social = participant.social
    const now = new Date()

    if (!social) {
      throw new Error('SOCIAL NOT FOUND')
    }

    const checkinStartTime = social.startDateTime - 60 * 60 * 1000
    const checkinEndTime = social.endDateTime + 60 * 60 * 1000
    if (now < checkinStartTime || now > checkinEndTime) {
      throw new Error('NOT THE RIGHT TIME TO CHECKIN')
    }
    console.log('checkinStartTime', checkinStartTime)
    console.log('checkinEndTime', checkinEndTime)

    // 更新球員出席狀態
    participant.status = '已出席'
    participant.checkedIn = true
    participant.checkedInTime = now
    await participant.save({ runValidators: true })

    // 5. 更新用戶的出席率 (使用 findOneAndUpdate 確保原子性)
    // 這裡建議使用 findOneAndUpdate，它可以避免在多個請求同時更新同一個用戶時造成的資料衝突 (Race Condition)
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { attendancePresent: 1, attendanceTotal: 1 } },
      { new: true, runValidators: true },
    )

    if (user) {
      // 計算新的出席率並儲存
      user.attendanceRate =
        user.attendanceTotal > 0 ? user.attendancePresent / user.attendanceTotal : 0
      await user.save({ runValidators: true })
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '簽到成功！',
    })
  } catch (error) {
    console.error('Error in controllers/socialParticipantController.js checkin', error)
    if (error.message === 'SOCIAL ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的簽到連結或場次 ID。',
      })
    } else if (error.message === 'MEMBER ONLY') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: '用戶未登入或身份無效，無法簽到。',
      })
    } else if (error.message === 'NOT BELONG TO THE SOCIAL') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '您已簽到或您並未報名本場次。',
      })
    } else if (error.message === 'SOCIAL NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到查詢的場次。',
      })
    } else if (error.message === 'NOT THE RIGHT TIME TO CHECKIN') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '目前非簽到時間，請在活動開始前或後一小時內簽到。',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，簽到失敗，請再試一次',
      })
    }
  }
}
