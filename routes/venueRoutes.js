import { Router } from 'express'
import * as venue from '../controllers/venueController.js'
import * as auth from '../middlewares/authMiddleware.js'
import { uploadImages } from '../middlewares/uploadMiddleware.js'
import { getCoordinates } from '../controllers/geoController.js'

const router = Router()

// 新增球場，不須為管理員，只需要是會員，每個人都可以新增
router.post('/', auth.checkToken, uploadImages, venue.create)

// 取得所有球場資料（包含停止營運球場），所以需要驗證是否為管理員
router.get('/all', auth.checkToken, auth.admin, venue.getAllAdmin)

router.get('/geo/coordinates', getCoordinates)

// 取得所有球場資料（不含停止營運），訪客也可以
router.get('/', venue.getAvailable)

// 用球場 ID 搜尋，訪客也可以
router.get('/:id', venue.getId)

// 更新球場資訊，不須為管理員，只需要是會員，每個人都可以更新
// 只可停止營運，不能刪除
router.patch('/:id', auth.checkToken, uploadImages, venue.update)

// 還沒寫

// 推薦最靠近使用者的球場，需取得使用者的所在地資訊

export default router
