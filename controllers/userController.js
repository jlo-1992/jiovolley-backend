import User from '../models/userModel.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import validator from 'validator'
import Product from '../models/productModel.js'
import dotenv from 'dotenv'
import Venue from '../models/venueModel.js'
dotenv.config()

// 本地註冊帳號
// 本地登入寫在 authMiddleware.js
export const create = async (req, res) => {
  try {
    // 限定使用者只輸入 email 及 password 欄位即可，其他 cart、token 和 role 都不用，預防使用者亂打資訊
    await User.create({
      email: req.body.email,
      password: req.body.password,
      name: req.body.name,
      gender: req.body.gender,
      skillLevel: req.body.skillLevel,
    })
    // 不需要回覆 result，只須讓使用者知道註冊成功即可，不須讓使用者知道 id 及 token
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '帳號註冊成功',
    })
  } catch (error) {
    console.error('Error in controllers/userController.js create', error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
      // user model 需設 unique: true;
      // 在 MongoDB 中 error code 11000 為重複鍵錯誤
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        success: false,
        message: '使用者已存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 登入
export const login = async (req, res) => {
  try {
    // https://github.com/auth0/node-jsonwebtoken?tab=readme-ov-file#jwtsignpayload-secretorprivatekey-options-callback
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens.push(token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '登入成功',
      user: {
        email: req.user.email,
        role: req.user.role,
        cartTotal: req.user.cartTotal,
        skillLevel: req.user.skillLevel,
        gender: req.user.gender,
        name: req.user.name,
        token,
      },
    })
  } catch (error) {
    console.log('controllers/userController.js login')
    console.error(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const lineLogin = async (req, res) => {
  try {
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens.push(token)
    await req.user.save()

    let redirectPath = ''
    if (req.user.skillLevel && req.user.gender) {
      // 資料已經完整，導向回首頁或其他原本要去的頁面
      // 你可能需要從前端傳入原本的導向路徑
      redirectPath = '/'
    } else {
      // 資料不完整，導向到會員資料頁面
      redirectPath = '/member/profile'
    }

    // 修改重定向 URL，加入 token 參數
    res.redirect(`${process.env.VITE_FRONTEND_URL}${redirectPath}?token=${token}`)
  } catch (error) {
    console.log('controllers/userController.js lineLogin')
    console.error(error)
    res.redirect(`${process.env.VITE_FRONTEND_URL}/logInSingUp?error=line_failed`)
  }
}

export const googleLogin = async (req, res) => {
  try {
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens.push(token)
    await req.user.save()

    let redirectPath = ''
    if (req.user.skillLevel && req.user.gender) {
      // 資料已經完整，導向回首頁或其他原本要去的頁面
      // 你可能需要從前端傳入原本的導向路徑
      redirectPath = '/'
    } else {
      // 資料不完整，導向到會員資料頁面
      redirectPath = '/member/profile'
    }

    // 修改重定向 URL，加入 token 參數
    res.redirect(`${process.env.VITE_FRONTEND_URL}${redirectPath}?token=${token}`)
  } catch (error) {
    console.log('controllers/userController.js lineLogin')
    console.error(error)
    res.redirect(`${process.env.VITE_FRONTEND_URL}/logInSingUp?error=line_failed`)
  }
}

// 取得會員資料
export const getProfile = (req, res) => {
  try {
    if (!req.user) {
      throw new Error('USER NOT FOUND')
    }
    res.status(StatusCodes.OK).json({
      success: true,
      // 因為在 userModel.js 已經設定了 toJSON 避開個資欄位
      // 所以此處可以直接回傳全部，不會回傳 password 跟 token 的資訊
      user: req.user,
    })
  } catch (error) {
    console.error('Error in controllers/userController.js getProfile', error)
    if (error.message === 'USER NOT FOUND') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: '未驗證的使用者資訊',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，無法獲取會員資料',
      })
    }
  }
}

export const updateProfile = async (req, res) => {
  try {
    // 構建更新的物件
    const updateData = {
      ...req.body,
    }

    if (!updateData.name) {
      return res.status(400).json({ message: '姓名為必填欄位。' })
    }
    if (!updateData.gender) {
      return res.status(400).json({ message: '性別為必填欄位。' })
    }
    if (!updateData.skillLevel) {
      return res.status(400).json({ message: '球技程度為必填欄位。' })
    }

    // 確保下方欄位不會被前端修改
    delete updateData.cart
    delete updateData.tokens
    delete updateData.attendanceRate
    delete updateData.attendanceTotal
    delete updateData.attendancePresent

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData, // 使用構建好的更新資料
      {
        new: true,
        runValidators: true,
      },
    ).orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '會員資料更新成功',
      user,
    })
  } catch (error) {
    console.error('Error in controllers/userController.js update', error)
    if (error.message === 'USER NOT FOUND') {
      // 當 req.user._id 找不到使用者時
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到會員資料',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 更新 token
// jwt.sign() 生成 JWT token
export const refresh = async (req, res) => {
  try {
    const i = req.user.tokens.indexOf(req.token)
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens[i] = token
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Token 更新成功',
      token,
    })
  } catch (error) {
    console.error('Error in controllers/userController.js refresh', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 登出
export const logout = async (req, res) => {
  try {
    // 從 tokens 中移除當前的 token
    req.user.tokens = req.user.tokens.filter((token) => token !== req.token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      success: true,
      message: '登出成功',
    })
  } catch (error) {
    console.error('Error in controllers/userController.js logout', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

export const getUserById = async (req, res) => {
  try {
    // 檢查使用者 ID 是否有效
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('USER ID INVALID')
    }

    const user = await User.findById(req.params.id).orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '使用者取得成功',
      user,
    })
  } catch (error) {
    console.log('controllers/userController.js getUserById')
    console.error(error)
    if (error.message === 'USER ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的使用者 ID',
      })
    } else if (error.message === 'USER NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const updateFavoriteVenues = async (req, res) => {
  try {
    // 構建更新的物件
    const { venueId } = req.body

    if (!validator.isMongoId(venueId)) {
      throw new Error('VENUE ID INVALID')
    }

    const venueExists = await Venue.findById(venueId)
    if (!venueExists) {
      throw new Error('VENUE NOT FOUND')
    }

    const user = await User.findById(req.user._id).orFail(new Error('USER NOT FOUND'))

    const isFavorite = user.favoriteVenues.includes(venueId)

    const updateOperation = isFavorite
      ? { $pull: { favoriteVenues: venueId } }
      : { $addToSet: { favoriteVenues: venueId } }

    const updateUser = await User.findByIdAndUpdate(req.user._id, updateOperation, {
      new: true,
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: isFavorite ? '已從收藏中移除' : '已加入收藏',
      user: {
        favoriteVenues: updateUser.favoriteVenues,
      },
    })
  } catch (error) {
    console.error('Error in controllers/userController.js updateFavoriteVenues', error)
    if (error.message === 'VENUE ID INVALID') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '無效的球場 ID 格式',
      })
    } else if (error.message === 'VENUE NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到該球場',
      })
    } else if (error.message === 'USER NOT FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '找不到會員資料',
      })
    } else if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: error.errors[key].message,
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

export const getFavoriteVenues = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('favoriteVenues')
      .orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      // 因為在 userModel.js 已經設定了 toJSON 避開個資欄位
      // 所以此處可以直接回傳全部，不會回傳 password 跟 token 的資訊
      user: {
        favoriteVenues: user.favoriteVenues,
      },
    })
  } catch (error) {
    console.error('Error in controllers/userController.js getFavoriteVenues', error)
    if (error.message === 'USER NOT FOUND') {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: '找不到會員資料',
      })
    } else {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤，無法取得收藏的球場',
      })
    }
  }
}

// export const updateFavoriteProducts = async (req, res) => {}
// export const getFavoriteProducts = async (req, res) => {}

// 新增/更新購物車商品，只有管理員有權限
export const cart = async (req, res) => {
  try {
    // 驗證新增的數量是否為數字，且是否為整數
    if (typeof req.body.quantity !== 'number' || !Number.isInteger(req.body.quantity)) {
      // 如果數量不是有效數字或不是整數，立即拋出錯誤
      throw new Error('INVALID QUANTITY TYPE')
    }

    // 驗證請求的商品 ID
    if (!validator.isMongoId(req.body.product)) {
      throw new Error('PRODUCT ID')
    }
    // 檢查商品是否存在
    await Product.findOne({ _id: req.body.product }).orFail(new Error('PRODUCT NOT FOUND'))

    // 檢查購物車中是否已經有該商品
    // 購物車內的 product 資料型態是 ObjectId，使用 .toString() 轉換為字串進行比較
    const i = req.user.cart.findIndex((item) => item.product.toString() === req.body.product)
    // 如果購物車中已經有該商品，則增加數量
    if (i > -1) {
      req.user.cart[i].quantity += req.body.quantity
      if (req.user.cart[i].quantity < 1) {
        // 如果數量小於 1，則從購物車中移除該商品
        req.user.cart.splice(i, 1)
      }
    }
    // 如果購物車中沒有該商品，且數量 > 0，則新增商品到購物車
    else if (req.body.quantity > 0) {
      req.user.cart.push({
        product: req.body.product,
        quantity: req.body.quantity,
      })
    }
    // 保存
    await req.user.save()

    res.status(StatusCodes.OK).json({
      success: true,
      message: '購物車已更新',
      result: req.user.cartTotal,
    })
  } catch (error) {
    console.error('Error in controllers/userController.js cart', error)
    if (error.message === 'INVALID QUANTITY TYPE') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品數量錯誤',
      })
    } else if (error.message === 'PRODUCT ID') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '商品 ID 格式錯誤',
      })
    } else if (error.message === 'PRODUCT NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '商品不存在',
      })
    } else if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 取得購物車資料
export const getCart = async (req, res) => {
  try {
    // email account        --> 只取 email 和 account 欄位
    // -password -email     --> 除了 password 和 email 以外的欄位
    const user = await User.findById(req.user._id, 'cart')
      // .populate(ref欄位, 指定取的欄位)
      // 關聯 cart.product 的 ref 指定的 collection，只取 name 欄位
      // .populate('cart.product', 'name')
      .populate('cart.product')
      .orFail(new Error('USER NOT FOUND'))

    res.status(StatusCodes.OK).json({
      success: true,
      message: '取得購物車資料成功',
      result: user.cart,
    })
  } catch (error) {
    console.error('Error in controllers/userController.js getCart', error)
    if (error.message === 'USER NOT FOUND') {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: '使用者不存在',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}
