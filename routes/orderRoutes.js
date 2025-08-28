import { Router } from 'express'
// * as  => 取得所有的 export
import * as auth from '../middlewares/authMiddleware.js'
import * as order from '../controllers/orderController.js'

// export 什麼時候要加大括號
// https://medium.com/@hiro05097952/%E6%A8%A1%E7%B5%84%E5%8C%96-1-es6-export-import-2df769cbd81b

const router = Router()
// 只有會員可以建立訂單
router.post('/', auth.checkToken, order.create)
// 使用者（會員）讀取自己的訂單
router.get('/my', auth.checkToken, order.getMy)
// 只有管理員可以讀取所有人的訂單
router.get('/all', auth.checkToken, auth.admin, order.getAllAdmin)

export default router
