import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { StatusCodes } from 'http-status-codes'
import dotenv from 'dotenv'

// 設定 cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// 上傳設定
const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
  }),
  // req = 請求資訊
  // file = 檔案資訊
  // callback(錯誤, 是否允許上傳)
  fileFilter(req, file, callback) {
    console.log('上傳檔案資訊:', file)
    console.log('正在檢查檔案類型:', file.mimetype)
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      // 只允許上傳 JPEG 或 PNG 檔案，
      callback(null, true)
    } else {
      console.log('檔案類型不符:', file.mimetype)
      callback(null, false)
    }
  },
  limits: {
    fileSize: 1024 * 1024, // 限制檔案大小為 1MB
  },
})

export default (req, res, next) => {
  upload.array('images', 5)(req, res, (error) => {
    // 處理上傳錯誤
    if (error) {
      console.error('上傳錯誤:', error)
      console.error('Multer 上傳錯誤:', error)
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '檔案上傳失敗，請確保檔案類型為 JPEG 或 PNG，且大小不超過 1MB',
      })
    }
    // 繼續下一步
    console.log('上傳成功:', req.files)
    console.log('Multer 成功處理檔案:', req.files)
    next()
  })
}
