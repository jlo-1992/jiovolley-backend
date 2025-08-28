import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { StatusCodes } from 'http-status-codes'
// 安裝 cors 前後端才能串聯，不會擋跨域
import cors from 'cors'
import userRouter from './routes/userRoutes.js'
import productRouter from './routes/productRoutes.js'
import orderRouter from './routes/orderRoutes.js'
import venueRouter from './routes/venueRoutes.js'
import venueCommentRouter from './routes/venueCommentRoutes.js'
import socialRouter from './routes/socialRoutes.js'
import socialParticipantRouter from './routes/socialParticipantRoutes.js'
import './config/passport.js'
import setupCronJobs from './cronJobs.js'
import { linebotParser } from './config/linebot.js'
import session from 'express-session'
import passport from 'passport'

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log('資料庫連線成功')
    mongoose.set('sanitizeFilter', true)
  })
  .catch((error) => {
    console.log('資料庫連線失敗')
    console.error('資料庫連線失敗', error)
  })

const app = express()
app.post('/linewebhook', linebotParser)
app.use(cors())

// 設定 express-session
app.use(
  session({
    secret: 'a-super-secret-key-that-you-should-change', // 請替換成你自己獨一無二的金鑰
    resave: false, // 每次請求結束時不強制儲存 session
    saveUninitialized: false, // 不強制儲存未初始化的 session
    // 你也可以在這裡加上 cookie 的設定，例如 maxAge
  }),
)
app.use(passport.initialize())
app.use(passport.session())

// 啟動 Cron Jobs
setupCronJobs()

// 解析 JSON 的格式
app.use(express.json())

// 如果 express.json 發生錯誤時執行，例如缺少或多逗號等格式錯誤
app.use((error, req, res, _next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    success: false,
    message: 'JSON 格式錯誤',
  })
})

// 開頭是 /user 的請求，都交由 userRouter 處理
app.use('/user', userRouter)
// 開頭是 /product 的請求，都交由 productRouter 處理
app.use('/product', productRouter)
// 開頭是 /order 的請求，都交由 orderRouter 處理
app.use('/order', orderRouter)
// 開頭是 /venue 的請求，都交由 venueRouter 處理
app.use('/venue', venueRouter)
// 開頭是 /venueComment 的請求，都交由 venueRouter 處理
app.use('/venueComment', venueCommentRouter)
// 開頭是 /social 的請求，都交由 socialRouter 處理
app.use('/social', socialRouter)
// 開頭是 /socialParticipant 的請求，都交由 socialParticipantRouter 處理
app.use('/socialParticipant', socialParticipantRouter)

app.get('/', (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: '歡迎來到我的網站平台！伺服器已啟動並運行。',
  })
})

// 處理未定義的路由
app.all(/.*/, (req, res) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: '找不到該路由',
  })
})

// 監聽 4000 的請求
app.listen(4000, () => {
  console.log('伺服器啟動')
})
