import Venue from '../models/venueModel.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
// import { getCoordinatesFromAddress } from '../utils/geocoding.js'

export const create = async (req, res) => {
  try {
    // 檢查地址是否提供
    if (!req.body.address) {
      throw new Error('ADDRESS EMPTY')
    }

    let imageUrls = []

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // req.files.map((file) => file.path) 取出所有照片的儲存路徑
      // imageUrls 會存有所有已上傳圖片的網址
      imageUrls = req.files.map((file) => file.path)
    }

    const venue = await Venue.create({
      ...req.body,
      images: imageUrls,
      // lat,
      // lng,
      lastUpdateBy: req.user._id,
    })
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '球場建立成功',
      venue,
    })
  } catch (error) {
    console.log('controllers/venueController.js create')
    console.error(error)
    if (error.name === 'ValidationError') {
      // 這是 Mongoose 的驗證錯誤，處理Schema中定義的驗證規則
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else if (error.message === 'ADDRESS EMPTY') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '球場地址必填',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const getAllAdmin = async (req, res) => {
  try {
    // 因為要取得全部資料，所以 find 裡面不填要過濾的事項
    const venues = await Venue.find()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '球場列表（包含已停業）取得成功',
      venues,
    })
  } catch (error) {
    console.log('controllers/venueController.js getAllAdmin')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getAvailable = async (req, res) => {
  try {
    const venues = await Venue.find({ open: true })
    res.status(StatusCodes.OK).json({
      success: true,
      message: '球場列表取得成功',
      venues,
    })
  } catch (error) {
    console.log('controllers/venueController.js getAvailable')
    console.error(error)
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
      throw new Error('VENUE ID INVALID')
    }

    const venue = await Venue.findById({ _id: req.params.id, open: true }).orFail(
      new Error('VENUE NOT FOUND'),
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: '球場取得成功',
      venue,
    })
  } catch (error) {
    console.log('controllers/venueController.js getId')
    console.error(error)
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
      throw new Error('VENUE ID INVALID')
    }

    const { existingImages } = req.body

    // 處理新上傳的圖片
    // 一樣取得所有新上傳圖片的網址之後，儲存到 newImageUrls 裡
    let newImageUrls = []
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      newImageUrls = req.files.map((file) => file.path)
    }
    // 處理前端傳來的「現有圖片」列表 (這些是使用者選擇保留的舊圖)
    // 確保 existingImages 是陣列，並過濾掉空字串或非字串
    let retainedExistingImageUrls = []
    const hasExistingImagesInBody = Object.prototype.hasOwnProperty.call(req.body, 'existingImages')
    if (hasExistingImagesInBody) {
      // 如果前端傳入的 existingImages 是一個字串（單張圖），將其轉為陣列
      if (typeof existingImages === 'string') {
        retainedExistingImageUrls = [existingImages]
      } else if (Array.isArray(existingImages)) {
        retainedExistingImageUrls = existingImages.filter(
          (url) => typeof url === 'string' && url.trim() !== '',
        )
      }
    }

    // 構建更新的物件
    const updateData = {
      ...req.body,
      lastUpdateBy: req.user._id,
    }

    // 如果某些欄位不應該直接從 req.body 複製，可以從 updateData 中刪除或調整
    delete updateData.existingImages // 避免將 existingImages 儲存到資料庫中

    // 將所有圖片 URL 合併：先是保留的舊圖，然後是新上傳的圖
    if (newImageUrls.length > 0 || hasExistingImagesInBody) {
      const finalImageUrls = [...retainedExistingImageUrls, ...newImageUrls]
      if (finalImageUrls.length === 0) {
        updateData.images = []
      } else {
        updateData.images = finalImageUrls
      }
    }

    const venue = await Venue.findByIdAndUpdate(
      req.params.id,
      updateData, // 使用構建好的更新資料
      {
        new: true,
        runValidators: true,
      },
    ).orFail(new Error('VENUE NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '球場更新成功',
      venue,
    })
  } catch (error) {
    console.log('controllers/venueController.js update')
    console.error(error)
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
