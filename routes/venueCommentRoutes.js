import { Router } from 'express'
import * as venueComment from '../controllers/venueCommentController.js'
import * as auth from '../middlewares/authMiddleware.js'
import { uploadImages } from '../middlewares/uploadMiddleware.js'

const router = Router()

// 只有會員可以建立新留言
router.post('/venue/:venueId', auth.checkToken, uploadImages, venueComment.create)

// 只有留言的人（會員）可以編輯留言
router.patch('/:id', auth.checkToken, uploadImages, venueComment.update)

// 只有管理員可以刪除留言
router.delete('/:id', auth.checkToken, auth.admin, venueComment.deleteComment)

// 訪客也可查看球場的所有留言（不包含已刪除的留言）
router.get('/venue/:venueId', venueComment.getComments)

// 只有管理員可以查看包含已刪除的所有留言
router.get('/all', auth.checkToken, auth.admin, venueComment.getAllAdmin)

// 只有會員可以檢舉留言
router.patch('/:id/report', auth.checkToken, venueComment.reportComment)

// 只有會員可以按讚留言
router.patch('/:id/like', auth.checkToken, venueComment.likeComment)

export default router
