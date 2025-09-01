import { Router } from 'express'
import * as product from '../controllers/productController.js'
import * as auth from '../middlewares/authMiddleware.js'
import { uploadImages } from '../middlewares/uploadMiddleware.js'

const router = Router()

// 只有管理員可以新增商品
router.post('/', auth.checkToken, auth.admin, uploadImages, product.create)

// 取得所有商品資料（包含未上架商品），所以需要驗證是否為管理員
router.get('/all', auth.checkToken, auth.admin, product.getAllAdmin)

// 取得所有商品資料（不含未上架），訪可也可以
router.get('/', product.getAvailable)

// 用商品 ID 搜尋，訪可也可以
router.get('/:id', product.getId)

// 只有管理員可以更新商品資訊，包含下架商品，只能下架不能刪除商品
router.patch('/:id', auth.checkToken, auth.admin, uploadImages, product.update)

export default router
