import Product from '../models/productModel.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'

export const create = async (req, res) => {
  try {
    console.log('images:', req.body.images)
    // 資料傳到 model 的驗證前先做一些簡易的驗證
    const { name, price } = req.body
    if (!name || typeof name !== 'string' || name.trim === '') {
      throw new Error('PRODUCT NAME INVALID')
    }
    const priceNumber = Number(price)
    if (isNaN(priceNumber) || priceNumber <= 0) {
      throw new Error('PRODUCT PRICE INVALID')
    }

    let imageUrls = []
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      // req.files.map((file) => file.path) 取出所有照片的儲存路徑
      // imageUrls 會存有所有已上傳圖片的網址
      imageUrls = req.files.map((file) => file.path)
    }

    const product = await Product.create({
      ...req.body,
      price: priceNumber,
      images: imageUrls,
    })
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '商品建立成功',
      product,
    })
  } catch (error) {
    console.error('Error in controllers/productController.js create', error)
    if (error.name === 'PRODUCT NAME INVALID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品名稱格式錯誤',
      })
    } else if (error.name === 'PRODUCT PRICE INVALID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品價格必須為數字且大於零',
      })
      // 這是 Mongoose 的驗證錯誤，處理Schema中定義的驗證規則
    } else if (error.name === 'ValidationError') {
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

export const getAllAdmin = async (req, res) => {
  try {
    // 因為要取得全部資料，所以 find 裡面不填要過濾的事項
    const products = await Product.find()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '商品列表（包含未上架）取得成功',
      products,
    })
  } catch (error) {
    console.error('Error in controllers/productController.js getAllAdmin', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getAvailable = async (req, res) => {
  try {
    // Product.find({ sell: true } 不顯示未上架商品
    const products = await Product.find({ sell: true })
    res.status(StatusCodes.OK).json({
      success: true,
      message: '商品列表取得成功',
      products,
    })
  } catch (error) {
    console.error('Error in controllers/productController.js getAvailable', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getId = async (req, res) => {
  try {
    // 檢查商品 ID 是否有效
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('PRODUCT ID INVALID')
    }

    const product = await Product.findById({ _id: req.params.id, sell: true }).orFail(
      new Error('PRODUCT NOT FOUND'),
    )

    res.status(StatusCodes.OK).json({
      success: true,
      message: '商品取得成功',
      product,
    })
  } catch (error) {
    console.error('Error in controllers/productController.js getId', error)
    if (error.message === 'PRODUCT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的商品 ID',
      })
    } else if (error.message === 'PRODUCT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '商品不存在',
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
    // 檢查商品 ID 是否有效
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('PRODUCT ID INVALID')
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
    // 即使傳遞的是空陣列 [], 也表示使用者有對圖片進行操作 (例如刪除所有舊圖)
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
      ...req.body, // 這裡會包含 name, price, description, category, sell 等
    }

    // 如果某些欄位不應該直接從 req.body 複製，可以從 updateData 中刪除或調整
    delete updateData.existingImages // 避免將 existingImages 儲存到資料庫中

    // 將所有圖片 URL 合併：先是保留的舊圖，然後是新上傳的圖
    // hasExistingImagesInBody 就算為空陣列，也代表使用者有對舊的圖片做更動
    if (newImageUrls.length > 0 || hasExistingImagesInBody) {
      const finalImageUrls = [...retainedExistingImageUrls, ...newImageUrls]
      if (finalImageUrls.length === 0) {
        updateData.images = []
      } else {
        updateData.images = finalImageUrls
      }
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData, // 使用構建好的更新資料
      {
        new: true,
        runValidators: true,
      },
    ).orFail(new Error('PRODUCT NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '商品更新成功',
      product,
    })
  } catch (error) {
    console.error('Error in controllers/productController.js update', error)
    if (error.message === 'PRODUCT ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的商品 ID',
      })
    } else if (error.message === 'PRODUCT NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '商品不存在',
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
