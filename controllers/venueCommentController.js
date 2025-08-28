import VenueComment from '../models/venueCommentModel.js'
import Venue from '../models/venueModel.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'

// 建立留言
export const create = async (req, res) => {
  try {
    // 檢查球場 ID 是否有效
    if (!validator.isMongoId(req.params.venueId)) {
      throw new Error('VENUE ID INVALID')
    }

    // 檢查球場是否存在
    const venueExists = await Venue.findById(req.params.venueId)
    if (!venueExists) {
      throw new Error('VENUE NOT FOUND')
    }

    let imageUrls = []
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // req.files.map((file) => file.path) 取出所有照片的儲存路徑
      // imageUrls 會存有所有已上傳圖片的網址
      imageUrls = req.files.map((file) => file.path)
    }

    const venueComment = await VenueComment.create({
      ...req.body,
      images: imageUrls,
      user: req.user._id,
      venue: req.params.venueId,
    })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '留言建立成功',
      venueComment,
    })
  } catch (error) {
    console.error('Error in controllers/venueCommentController.js create', error)
    if (error.message === 'VENUE ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場 ID',
      })
    } else if (error.message === 'VENUE NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '球場不存在',
      })
    } else if (error.name === 'ValidationError') {
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

// 編輯留言，只有建立留言的人可以編輯
export const update = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('VENUE COMMENT ID INVALID')
    }

    const { existingImages = [] } = req.body

    let newImageUrls = []
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      newImageUrls = req.files.map((file) => file.path)
    }

    let retainedExistingImageUrls = []
    // 如果前端傳入的 existingImages 是一個字串（單張圖），將其轉為陣列
    if (typeof existingImages === 'string') {
      retainedExistingImageUrls = [existingImages]
    } else if (Array.isArray(existingImages)) {
      retainedExistingImageUrls = existingImages.filter(
        (url) => typeof url === 'string' && url.trim() !== '',
      )
    }

    // 構建更新的物件
    const updateData = {
      ...req.body,
      user: req.user._id,
    }

    delete updateData.venue
    delete updateData.user
    delete updateData.like

    updateData.user = req.user._id

    const finalImageUrls = [...retainedExistingImageUrls, ...newImageUrls]

    const hasImageUpdates =
      newImageUrls.length > 0 || Object.prototype.hasOwnProperty.call(req.body, 'existingImages')
    // 如果前端傳了 existingImages 但為空，則代表清空圖片
    // 如果前端沒有傳 existingImages，則不更新圖片欄位
    if (hasImageUpdates) {
      updateData.images = finalImageUrls
    }

    const venueComment = await VenueComment.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).orFail(new Error('VENUE COMMENT NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '留言更新成功',
      venueComment,
    })
  } catch (error) {
    console.error('Error in controllers/venueCommentController.js update', error)
    if (error.message === 'VENUE COMMENT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場留言 ID',
      })
    } else if (error.message === 'VENUE COMMENT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '球場留言不存在',
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

// 刪除留言，限制只有管理員可以刪除留言
export const deleteComment = async (req, res) => {
  try {
    // 在搜尋前檢查留言 ID 是否有效
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('VENUE COMMENT ID INVALID')
    }

    const deletedComment = await VenueComment.findByIdAndDelete(req.params.id)

    if (!deletedComment) {
      throw new Error('VENUE COMMENT NOT FOUND')
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: '留言刪除成功',
    })
  } catch (error) {
    console.error('Error in controllers/venueCommentController.js deleteComment', error)
    if (error.message === 'VENUE COMMENT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場留言 ID',
      })
    } else if (error.message === 'VENUE COMMENT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '球場留言不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 訪客可察看球場的所有留言（不包括已刪除的留言）
export const getComments = async (req, res) => {
  try {
    // 檢查球場 ID 是否有效
    if (!validator.isMongoId(req.params.venueId)) {
      throw new Error('VENUE ID INVALID')
    }

    // 檢查球場是否存在
    const venueExists = await Venue.findById(req.params.venueId)
    if (!venueExists) {
      throw new Error('VENUE NOT FOUND')
    }

    const venueComments = await VenueComment.find({ venue: req.params.venueId, isDeleted: false })
    res.status(StatusCodes.OK).json({
      success: true,
      message: '球場留言板取得成功',
      venueComments,
    })
  } catch (error) {
    console.log('controllers/venueCommentController.js getComments')
    console.error(error)
    if (error.message === 'VENUE COMMENT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場留言 ID',
      })
    } else if (error.message === 'VENUE COMMENT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '球場留言不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 管理員可以查看包含已刪除的所有留言
export const getAllAdmin = async (req, res) => {
  try {
    const venueComments = await VenueComment.find()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '所有球場留言（包含已刪除）取得成功',
      venueComments,
    })
  } catch (error) {
    console.error('Error in controllers/venueCommentController.js getAllAdmin', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 會員檢舉檢舉留言
export const reportComment = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('VENUE COMMENT ID INVALID')
    }

    // 只讓前端修改 reason 欄位，其他都從後端輸入
    const { reason = '其他' } = req.body || {}
    const userId = req.user._id

    const targetComment = await VenueComment.findById(req.params.id)
    if (!targetComment) {
      throw new Error('VENUE COMMENT NOT FOUND')
    }
    // 驗證此使用者是否有重複舉報
    const hasReported = targetComment.reports.some(
      (report) => report.reportedBy.toString() === userId.toString(),
    )
    if (hasReported) {
      return res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '您已檢舉過這則留言，無法重複檢舉。',
      })
    }

    const updateFields = {
      isReported: true, // 至少有一人檢舉就設為 true
      $push: { reports: { reportedBy: userId, reason: reason || '其他' } }, // 記錄檢舉者和原因
      $inc: { reportCount: 1 }, // 檢舉次數加一
    }

    const venueComment = await VenueComment.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: '留言已成功檢舉，感謝您的回報！',
      venueComment,
    })
  } catch (error) {
    console.error('Error in controllers/venueCommentController.js reportComment', error)
    if (error.message === 'VENUE COMMENT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場留言 ID',
      })
    } else if (error.message === 'VENUE COMMENT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '球場留言不存在',
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

export const likeComment = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('VENUE COMMENT ID INVALID')
    }

    const userId = req.user._id

    const targetComment = await VenueComment.findById(req.params.id)
    if (!targetComment) {
      throw new Error('VENUE COMMENT NOT FOUND')
    }
    let action = {}
    let message = ''

    // 驗證此使用者是否重複按讚
    const hasliked = targetComment.likedBy.some((id) => id.toString() === userId.toString())
    // const hasliked = targetComment.likedBy.includes(userId)
    if (hasliked) {
      action = { $pull: { likedBy: userId }, $inc: { likes: -1 } }
      message = '您已收回讚！'
    } else {
      action = { $push: { likedBy: userId }, $inc: { likes: 1 } }
      message = '已按讚留言！'
    }

    const venueComment = await VenueComment.findByIdAndUpdate(req.params.id, action, {
      new: true,
      runValidators: true,
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: message,
      venueComment,
    })
  } catch (error) {
    console.error('Error in controllers/venueCommentController.js likeComment', error)
    if (error.message === 'VENUE COMMENT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場留言 ID',
      })
    } else if (error.message === 'VENUE COMMENT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '球場留言不存在',
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
