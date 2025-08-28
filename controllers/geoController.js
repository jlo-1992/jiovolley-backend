import axios from 'axios'

export const getCoordinates = async (req, res) => {
  try {
    const { address } = req.query
    if (!address) {
      return res.status(400).send({ success: false, message: '地址參數缺失' })
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
    const nominatimResponse = await axios.get(nominatimUrl, {
      headers: {
        'User-Agent': 'JIOVOLLEY', // 請替換成你的應用程式名稱
      },
    })

    if (!nominatimResponse.data || nominatimResponse.data.length === 0) {
      return res
        .status(404)
        .send({ success: false, message: '找不到對應的地址，請檢查地址是否正確' })
    }

    const result = nominatimResponse.data[0]
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)

    res.status(200).send({ success: true, message: '地址轉換成功', lat, lng })
  } catch (error) {
    console.error('地址轉換錯誤:', error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}
