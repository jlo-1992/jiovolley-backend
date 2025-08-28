import axios from 'axios'
import { StatusCodes } from 'http-status-codes'

/**
 * 將地址轉換為經緯度
 * @param {string} address - 要轉換的地址
 * @returns {Promise<{ lat: number, lng: number }>} 經緯度物件
 * @throws {Error} 如果地址無效或 API 呼叫失敗
 */
export const getCoordinatesFromAddress = async (address) => {
  if (!address) {
    throw new Error('地址參數缺失')
  }

  const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  try {
    const response = await axios.get(nominatimUrl, {
      headers: {
        'User-Agent': 'jiovolley', // 替換成你的專案名稱
      },
    })

    if (!response.data || response.data.length === 0) {
      throw new Error('找不到對應的地址，請檢查地址是否正確')
    }

    const result = response.data[0]
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    }
  } catch (error) {
    console.error('地址轉換錯誤:', error)
    // 拋出錯誤，讓呼叫者可以處理
    throw new Error(error.message || '地址轉換服務發生錯誤')
  }
}
