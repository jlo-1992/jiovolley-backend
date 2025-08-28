import Social from '../models/socialModel.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
import { trusted } from 'mongoose'
import { generateQrCodeDataUrl } from '../utils/qrCodeGenerator.js'

export const create = async (req, res) => {
  try {
    const social = await Social.create({
      ...req.body,
      host: req.user._id,
      isCanceled: false,
    })
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '場次建立成功',
      social,
    })
  } catch (error) {
    console.error('Error in controllers/socialController.js create', error)
    if (error.name === 'ValidationError') {
      // 這是 Mongoose 的驗證錯誤，處理Schema中定義的驗證規則
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
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

export const getAll = async (req, res) => {
  try {
    const { time } = req.query
    const now = new Date()
    const query = {}
    if (time) {
      if (time === 'upcoming') {
        query.startDateTime = trusted({ $gt: now })
      } else if (time === 'past') {
        query.startDateTime = trusted({ $lt: now })
      }
    }
    // 因為要取得全部資料，所以 find 裡面不填要過濾的事項
    const socials = await Social.find(query)
      .populate('venue', 'name city address trafficInfo')
      .populate('host', 'name')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '所有場次列表（包含暫停徵人、已過期）取得成功',
      socials,
    })
  } catch (error) {
    console.error('Error in controllers/socialController.js getAll', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getAvailable = async (req, res) => {
  try {
    const now = new Date()

    const socials = await Social.find({
      isCanceled: false,
      startDateTime: trusted({ $gte: now }),
    })
      .populate('venue', 'name city address trafficInfo images')
      .populate('host', 'name')
    res.status(StatusCodes.OK).json({
      success: true,
      message: '徵人中的場次列表取得成功',
      socials,
    })
  } catch (error) {
    console.error('Error in controllers/socialController.js getAvailable', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getId = async (req, res) => {
  try {
    // 檢查球場 ID 是否有效
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('SOCIAL ID INVALID')
    }

    const social = await Social.findById(req.params.id).orFail(new Error('SOCIAL NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '場次搜尋成功',
      social,
    })
  } catch (error) {
    console.error('Error in controllers/socialController.js getId', error)

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
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const update = async (req, res) => {
  try {
    // 檢查球場 ID 是否有效
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('SOCIAL ID INVALID')
    }

    const target = await Social.findById(req.params.id)
    if (!target) {
      throw new Error('SOCIAL NOT FOUND')
    }

    if (target.host.toString() !== req.user._id.toString()) {
      throw new Error('NOT THE HOST')
    }

    // 構建更新的物件
    const updateData = {
      ...req.body,
    }

    // 確保 host 欄位不會被前端修改
    delete updateData.host
    delete updateData.qrCodeToken
    delete updateData.venue

    const social = await Social.findByIdAndUpdate(
      req.params.id,
      updateData, // 使用構建好的更新資料
      {
        new: true,
        runValidators: true,
      },
    ).orFail(new Error('SOCIAL NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '場次更新成功',
      social,
    })
  } catch (error) {
    console.error('Error in controllers/socialController.js update', error)
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
    } else if (error.message === 'NOT THE HOST') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '只有該場次主揪可以修改場次資訊',
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

export const getQrCode = async (req, res) => {
  try {
    const socialId = req.params.socialId
    const userId = req.user._id
    const userRole = req.user.role

    if (!socialId) {
      throw new Error('SOCIAL ID INVALID')
    }
    const social = await Social.findById(socialId).select('host startDateTime qrCodeGenerated')
    if (!social) {
      throw new Error('SOCIAL NOT FOUND')
    }

    console.log('User ID (from token):', userId.toString())
    console.log('User Role (from token):', userRole)
    console.log('Social Host ID (from DB):', social.host.toString())
    console.log('Is User Host?', social.host.toString() === userId.toString())
    console.log('Is User Admin?', userRole === 'admin')

    // const isHost = social.host.toString() === userId.toString()
    // const isAdmin = userRole === 'admin'
    // if (!isHost && !isAdmin) {
    //   throw new Error('NOT THE HOST OR ADMIN')
    // }

    // 構造統一的簽到 URL
    // 假設前端會將用戶導向這個 API endpoint
    const checkinUrl = `${process.env.VITE_BACKEND_URL}/api/socials/${socialId}/checkin`

    // 生成 QR Code Data URL
    let qrCodeDataUrl

    // 檢查資料庫是否已生成過 QR Code
    if (social.qrCodeGenerated) {
      // 如果已生成，則直接回傳，並重新生成 QR Code Data URL
      // 這裡不從資料庫讀取，而是重新生成，確保資料是最新的
      qrCodeDataUrl = await generateQrCodeDataUrl(checkinUrl)
    } else {
      // 如果未生成，則生成 QR Code Data URL 並更新資料庫狀態
      qrCodeDataUrl = await generateQrCodeDataUrl(checkinUrl)

      // 使用 findByIdAndUpdate 只需要更新狀態，不需要儲存 QR Code 本身
      await Social.findByIdAndUpdate(socialId, {
        qrCodeGenerated: true,
      })
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: `取得 ${social.startDateTime} 場次簽到 QR Code 成功`,
      qrCodeDataUrl: qrCodeDataUrl,
      checkinUrl: checkinUrl,
      qrCodeGenerated: true,
    })
  } catch (error) {
    console.error('Error in controllers/socialController.js getQrCode:', error)
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
    } else if (error.message === 'NOT THE HOST OR ADMIN') {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: '只有管理員或場次主揪有權查看 QR CODE',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，無法生成簽到 QR Code。',
      })
    }
  }
}
