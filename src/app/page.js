'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Copy, Check, AlertCircle, Loader2, Globe, Zap, Sparkles } from 'lucide-react'

export default function UIPage() {
  const [inputCoords, setInputCoords] = useState('')
  const [convertedCoords, setConvertedCoords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const polygonRef = useRef(null)

  // 初始化百度地图
  useEffect(() => {
    if (typeof window !== 'undefined' && window.BMap) {
      initMap()
      return
    }

    const script = document.createElement('script')
    const baiduMapAk = process.env.NEXT_PUBLIC_BAIDU_MAP_AK
    if (!baiduMapAk) {
      console.error('百度地图API Key未配置，请在.env.local文件中设置NEXT_PUBLIC_BAIDU_MAP_AK')
      return
    }
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${baiduMapAk}&callback=initBaiduMap`
    script.async = true
    script.defer = true

    window.initBaiduMap = () => {
      initMap()
    }

    document.head.appendChild(script)

    return () => {
      if (window.initBaiduMap) {
        delete window.initBaiduMap
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  const initMap = () => {
    if (mapRef.current && !mapInstanceRef.current && typeof window !== 'undefined' && window.BMap) {
      const map = new window.BMap.Map(mapRef.current)
      const centerPoint = new window.BMap.Point(121.081369, 29.266251)
      map.centerAndZoom(centerPoint, 15)
      map.enableScrollWheelZoom(true)
      mapInstanceRef.current = map
    }
  }

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.BMap &&
      mapInstanceRef.current &&
      convertedCoords.length > 0
    ) {
      if (polygonRef.current) {
        mapInstanceRef.current.removeOverlay(polygonRef.current)
        polygonRef.current = null
      }

      const points = convertedCoords.map(coord =>
        new window.BMap.Point(coord.x, coord.y)
      )

      const polygon = new window.BMap.Polygon(points, {
        strokeColor: '#ff6b6b',
        strokeWeight: 3,
        strokeOpacity: 0.9,
        fillColor: '#ff6b6b',
        fillOpacity: 0.2
      })

      mapInstanceRef.current.addOverlay(polygon)
      polygonRef.current = polygon

      const viewport = mapInstanceRef.current.getViewport(points)
      mapInstanceRef.current.centerAndZoom(viewport.center, viewport.zoom)
    }
  }, [convertedCoords])

  const formatConvertedCoords = (coords) => {
    if (!coords || coords.length === 0) return ''
    return coords.map(coord => `${coord.x},${coord.y}`).join(';') + ';'
  }

  const copyCoords = async () => {
    const formattedCoords = formatConvertedCoords(convertedCoords)
    if (!formattedCoords) return

    try {
      await navigator.clipboard.writeText(formattedCoords)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = formattedCoords
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        setError('复制失败，请手动复制')
      }
      document.body.removeChild(textArea)
    }
  }

  const convertCoords = async () => {
    if (!inputCoords.trim()) {
      setError('请输入坐标数据')
      return
    }

    setLoading(true)
    setError('')
    setConvertedCoords([])
    setCopied(false)

    try {
      const response = await fetch('/api/convert-coords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coords: inputCoords.trim()
        })
      })

      const data = await response.json()

      if (data.success && data.result && data.result.length > 0) {
        setConvertedCoords(data.result)
        setError('')
      } else {
        setError(data.error || '转换失败')
      }
    } catch (err) {
      setError(`转换失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl" />
      </div>

      {/* 地图容器 - 全屏显示 */}
      <div className="absolute inset-0">
        <div
          ref={mapRef}
          className="w-full h-full"
        />
      </div>

      {/* 浮动控制面板 - 移到左侧 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute top-4 left-4 z-10 w-full max-w-sm"
      >
        <div className="bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-center mb-4"
          >
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 blur-lg opacity-50" />
                <Globe className="relative w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-cyan-300 to-purple-300 bg-clip-text text-transparent">
              坐标转换器
            </h1>
            <p className="text-slate-200 mt-1 text-xs">高德 → 百度</p>
          </motion.div>

          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="space-y-6"
          >
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-200 mb-1.5">
                <MapPin className="w-3.5 h-3.5" />
                输入高德坐标
              </label>
              <textarea
                value={inputCoords}
                onChange={(e) => setInputCoords(e.target.value)}
                placeholder="121.081369,29.266251_..."
                className="w-full h-20 px-3 py-2 bg-slate-900/90 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all duration-200 text-sm shadow-lg"
              />
            </div>

            <motion.button
              onClick={convertCoords}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 px-3 bg-slate-800/95 hover:bg-slate-700/95 border border-slate-600/50 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  转换中
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  转换
                </>
              )}
            </motion.button>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-1.5 p-2 bg-red-900/90 border border-red-700/50 rounded-lg text-red-300 text-xs"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="truncate">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {convertedCoords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="text-xs font-medium text-white/90">
                        {convertedCoords.length} 个点
                      </span>
                    </div>
                    <motion.button
                      onClick={copyCoords}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-2.5 py-1 bg-slate-700/90 hover:bg-slate-600/90 border border-slate-600/50 text-white/90 text-xs rounded-md transition-all duration-200 flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                        </>
                      )}
                    </motion.button>
                  </div>
                  <textarea
                    readOnly
                    value={formatConvertedCoords(convertedCoords)}
                    className="w-full h-16 px-3 py-2 bg-slate-900/90 border border-slate-700/50 rounded-lg text-white/90 text-xs font-mono resize-none shadow-lg"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}