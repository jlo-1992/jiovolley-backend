import { Router } from 'express'
import * as user from '../controllers/userController.js'
import * as auth from '../middlewares/authMiddleware.js'
import { uploadAvatar } from '../middlewares/uploadMiddleware.js'
import passport from 'passport'

const router = Router()

// 本地註冊及登入
router.post('/', user.create)
router.post('/login', auth.login, user.login)

// 第三方登入
router.get('/auth/line', auth.lineLogin)
// 檢查這個路由是否存在，且路徑是否正確
router.get(
  '/auth/line/callback',
  // 使用 passport 處理回呼
  passport.authenticate('line', {
    failureRedirect: `${process.env.VITE_FRONTEND_URL}/logInSingUp`, // 失敗時導向的頁面
    session: true,
  }),
  user.lineLogin,
)
router.get('/auth/google', auth.googleLogin)
router.get(
  '/auth/google/callback', // 使用 passport 處理回呼
  passport.authenticate('google', {
    failureRedirect: `${process.env.VITE_FRONTEND_URL}/logInSingUp`, // 失敗時導向的頁面
    session: true,
  }),
  user.googleLogin,
)

// 取得會員資料
router.get('/profile', auth.checkToken, user.getProfile)

// 更新會員資料
router.patch('/profile', auth.checkToken, uploadAvatar, user.updateProfile)

// 更新 token
router.patch('/refresh', auth.checkToken, user.refresh)

// 登出
router.delete('/logout', auth.checkToken, user.logout)

// 新增/更新購物車商品
router.patch('/cart', auth.checkToken, user.cart)

// 取得購物車資料
router.get('/cart', auth.checkToken, user.getCart)

// 透過 objectID 取得使用者的資料
router.get('/:id', user.getUserById)

// 收藏球場
router.patch('/favoriteVenues', auth.checkToken, user.updateFavoriteVenues)

// 取得收藏的球場
router.get('/favoriteVenues', auth.checkToken, user.getFavoriteVenues)

// 收藏商品
// router.patch('/favoriteProducts', auth.checkToken, user.updateFavoriteProducts)

// 取得收藏的商品
// router.get('favoriteProducts', auth.checkToken, user.getFavoriteProducts)

export default router
