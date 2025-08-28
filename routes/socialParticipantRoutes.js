import { Router } from 'express'
import * as socialParticipant from '../controllers/socialParticipantController.js'
import * as auth from '../middlewares/authMiddleware.js'

const router = Router()

// 會員本人操作---------------------------------------------------------------
// 建立報名
router.post('/social/:socialId/participants', auth.checkToken, socialParticipant.create)

// QR Code 掃描簽到路由
router.patch('/social/:socialId/checkin', auth.checkToken, socialParticipant.checkin)

// 會員本人取消某個場次的報名（更改報名狀態）
router.patch('/social/:socialId/my-participation', auth.checkToken, socialParticipant.update)

// 會員本人查詢所有已報名的場次
router.get('/my-participations', auth.checkToken, socialParticipant.getMyParticipations)

// 會員可查詢場次的球員名單
router.get('/social/:socialId/participants', auth.checkToken, socialParticipant.getParticipantsList)

// 主揪及管理員操作-------------------------------------------------------------------

// 主揪及管理員更改本場次球員的報名狀態
router.patch(
  '/social/:socialId/participants/:participantId/status',
  auth.checkToken,
  socialParticipant.updateHostAndAdmin,
)

// 管理員操作------------------------------------------------------------------

// 管理員查詢某個使用者所有的報名紀錄
router.get(
  '/users/:userId/participations/admin',
  auth.checkToken,
  auth.admin,
  socialParticipant.getUserParticipantAdmin,
)

export default router
