import Order from '../models/orderModel.js'
import User from '../models/userModel.js'
import { StatusCodes } from 'http-status-codes'
import mongoose from 'mongoose'

// 建立訂單
export const create = async (req, res) => {
  // session 是資料儲存至資料庫前的一個臨時工作區、暫存區
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // 檢查購物車內是否有商品
    if (req.user.cart.length === 0) throw new Error('CART IS EMPTY')

    // 需要驗證購物車內是否有已下架的商品
    const user = await User.findById(req.user._id, 'cart').populate({
      path: 'cart.product',
      select: 'sell',
      session,
    })
    // .some 檢查陣列裡是否有物件執行 function 後會 return true
    // 也就是檢查購物車內是否有已下架商品
    const hasUnsell = user.cart.some((item) => !item.product.sell)
    if (hasUnsell) throw new Error('UNSELL PRODUCT')

    // 驗證都通過的話，建立訂單
    await Order.create(
      [
        {
          user: req.user._id,
          cart: user.cart,
        },
      ],
      { session },
    )

    // 訂單建立後，清空購物車
    req.user.cart = []
    // 將清空後的購物車儲存到使用者的資料內，同時傳入 session
    await req.user.save({ session })

    await session.commitTransaction()
    session.endSession()
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '訂單建立成功',
    })
  } catch (error) {
    console.error('Error in controllers/orderController.js create', error)
    // 如果發生錯誤，中止交易，確保所有操作都取消，回復到未操作前的狀態
    if (session.inTransaction()) {
      await session.abortTransaction()
      session.endSession()
    }

    if (error.message === 'CART IS EMPTY') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '購物車是空的',
      })
    } else if (error.message === 'UNSELL PRODUCT') {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: '購物車中有未上架商品',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: '伺服器內部錯誤',
      })
    }
  }
}

// 使用者讀取自己的訂單
export const getMy = async (req, res) => {
  try {
    // .find(確認 user 欄位為現在登入的使用者)
    const orders = await Order.find({ user: req.user._id })
      .populate('cart.product') // 取得購物車內的商品資料
      .sort({ createdAt: -1 }) // -1 => 最新一筆的資料排在最前面

    res.status(StatusCodes.OK).json({
      success: true,
      message: '讀取訂單成功',
      result: orders,
    })
  } catch (error) {
    console.error('Error in controllers/orderController.js getMy', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}

// 管理員讀取所有人的訂單
export const getAllAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name', 'email line_uid google_uid')
      .populate('cart.product') // 取得購物車內的商品資料
      .sort({ createdAt: -1 }) // -1 => 最新一筆的資料排在最前面

    res.status(StatusCodes.OK).json({
      success: true,
      message: '讀取所有訂單成功',
      result: orders,
    })
  } catch (error) {
    console.error('Error in controllers/orderController.js getAllAdmin', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: '伺服器內部錯誤',
    })
  }
}
