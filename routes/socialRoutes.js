import { Router } from 'express'
import * as social from '../controllers/socialController.js'
import * as auth from '../middlewares/authMiddleware.js'

const router = Router()

// 新增場次，不須為管理員，只需要是會員，每個人都可以新增
router.post('/', auth.checkToken, social.create)

// 取得所有場次資料（包含暫停徵人、已過期）
router.get('/all', auth.checkToken, social.getAll)

// 取得所有還在徵人的場次資料（不含暫停徵人、已過期），訪客也可以
router.get('/', social.getAvailable)

// 用場次 ID 搜尋，訪客也可以
router.get('/:id', social.getId)

// 更新場次資訊，不須為管理員，但需要限制為主揪本人（會員）
// 只可暫停徵人，不能刪除
router.patch('/:id', auth.checkToken, social.update)

// 管理員或主揪可以取得場次的 qrcode
router.get('/:socialId/qrcode/admin', auth.checkToken, social.getQrCode)

export default router
