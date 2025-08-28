import passport from 'passport'
import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

// 開始 google 登入流程，導向 google 登入頁面
// google 登入涉及瀏覽器重定向和回調，因此從 GET 請求開始
export const googleLogin = passport.authenticate('google', { scope: ['profile', 'email'] })

// 經由 passport 驗證完畢帳號後
// 此處產生 JWT token，並將使用者導回前端首頁（帶著 token）
export const googleCallback = (req, res, next) => {
  // 登入失敗會導回 google 登入頁面，並帶錯誤訊息
  // (req, res) 參數會傳給 createToken
  // 如果驗證成功，Passport 會自動呼叫 next()
  passport.authenticate('google', {
    session: false,
    failureRedirfailureRedirect: '/login?error=line_failed',
  })(req, res, next)
}

export const lineLogin = passport.authenticate('line', { scope: ['profile', 'openid', 'email'] })

// 經由 passport 驗證完畢帳號後
// 此處產生 JWT token，並將使用者導回前端首頁（帶著 token）
export const lineCallback = (req, res, next) => {
  // 登入失敗會導回 line 登入頁面，並帶錯誤訊息
  // (req, res) 參數會傳給 createToken
  // 如果驗證成功，Passport 會自動呼叫 next()
  passport.authenticate('line', { session: false, failureRedirect: '/login?error=line_failed' })(
    req,
    res,
    next,
  )
}

// 因為這個步驟是任何成功登入或驗證後都需要進行的操作，所以寫在這裡可以避免大量重複程式碼
export const login = (req, res, next) => {
  // 使用 passport 的 login 驗證方法
  // passport.authenticate(驗證方法, 設定, 處理function)
  // session: false = 停用 cookie
  // 處理function 的 (error, user, info) 對應 passport 驗證後 done() 的三個東西
  passport.authenticate('login', { session: false }, (error, user, info) => {
    // 如果沒有收到使用者資料，或發生錯誤
    if (!user || error) {
      // Local 驗證策略內建的錯誤，缺少帳號密碼欄位時會發生
      if (info?.message === 'Missing credentials') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '請提供信箱及密碼',
        })
      }
      // 不是發生錯誤，但是驗證失敗，例如收到 "使用者不存在" 或 "密碼錯誤" 的訊息
      else if (!error && info) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: info.message,
        })
      }
      // 其他錯誤
      else {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '伺服器內部錯誤',
        })
      }
    }
    // 如果驗證成功
    // 將查詢到的使用者資料放入 req 給後續的 userController 使用
    req.user = user
    // 繼續下一步
    next()
  })(req, res, next)
}

// 產生 JWT token 並儲存回傳給前端
// export const createToken = async (req, res) => {
//   try {
//     if (!req.user || !req.user._id) {
//       return res
//         .status(StatusCodes.UNAUTHORIZED)
//         .json({ success: false, message: '認證失敗，無使用者資訊' })
//     }

//     const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
//     req.user.tokens.push(token)
//     await req.user.save()

//     res.status(StatusCodes.OK).json({
//       success: true,
//       message: '登入成功',
//       user: {
//         account: req.user.email,
//         role: req.user.role,
//         cartTotal: req.user.cartTotal,
//         token,
//       },
//     })
//   } catch (error) {
//     console.error('Error in createToken:', error)
//     res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: '伺服器內部錯誤',
//     })
//   }
// }

// 驗證使用者是否持有有效的 JWT Token
export const checkToken = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error, data, info) => {
    console.log('passport.js token')
    // console.log(error, data, info)
    if (!data || error) {
      // 是不是 JWT 錯誤，可能是過期、格式錯誤、SECRET 錯誤等
      if (info instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: '無效的 token',
        })
      }
      // 其他 info，可能是查無使用者
      else if (info) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: info.message || '無效的 token',
        })
      }
      // 沒有 info，但是有錯誤
      else {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: '伺服器內部錯誤',
        })
      }
    }
    req.user = data.user
    req.token = data.token
    next()
  })(req, res, next)
}

export const admin = (req, res, next) => {
  // 檢查使用者是否為管理員
  if (req.user.role !== 'admin') {
    return res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: '您沒有管理員權限',
    })
  }
  next()
}
