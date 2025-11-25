'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [inputCoords, setInputCoords] = useState('');
  const [convertedCoords, setConvertedCoords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);

  // 初始化百度地图
  useEffect(() => {
    // 检查是否已经加载了百度地图API
    if (typeof window !== 'undefined' && window.BMap) {
      initMap();
      return;
    }

    // 动态加载百度地图API
    const script = document.createElement('script');
    const baiduMapAk = process.env.NEXT_PUBLIC_BAIDU_MAP_AK;
    if (!baiduMapAk) {
      console.error('百度地图API Key未配置，请在.env.local文件中设置NEXT_PUBLIC_BAIDU_MAP_AK');
      return;
    }
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${baiduMapAk}&callback=initBaiduMap`;
    script.async = true;
    script.defer = true;

    window.initBaiduMap = () => {
      initMap();
    };

    document.head.appendChild(script);

    return () => {
      // 清理
      if (window.initBaiduMap) {
        delete window.initBaiduMap;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // 初始化地图函数
  const initMap = () => {
    if (mapRef.current && !mapInstanceRef.current && typeof window !== 'undefined' && window.BMap) {
      // 创建地图实例
      const map = new window.BMap.Map(mapRef.current);
      
      // 设置中心点和缩放级别（使用示例坐标的中心点）
      const centerPoint = new window.BMap.Point(121.081369, 29.266251);
      map.centerAndZoom(centerPoint, 15);
      
      // 启用滚轮缩放
      map.enableScrollWheelZoom(true);
      
      mapInstanceRef.current = map;
    }
  };

  // 更新地图上的多边形
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.BMap &&
      mapInstanceRef.current &&
      convertedCoords.length > 0
    ) {
      // 清除之前的多边形
      if (polygonRef.current) {
        mapInstanceRef.current.removeOverlay(polygonRef.current);
        polygonRef.current = null;
      }

      // 创建新的多边形
      const points = convertedCoords.map(coord => 
        new window.BMap.Point(coord.x, coord.y)
      );

      const polygon = new window.BMap.Polygon(points, {
        strokeColor: '#3388ff',
        strokeWeight: 2,
        strokeOpacity: 0.8,
        fillColor: '#3388ff',
        fillOpacity: 0.3
      });

      mapInstanceRef.current.addOverlay(polygon);
      polygonRef.current = polygon;

      // 调整地图视野以包含所有点
      const viewport = mapInstanceRef.current.getViewport(points);
      mapInstanceRef.current.centerAndZoom(viewport.center, viewport.zoom);
    }
  }, [convertedCoords]);

  // 格式化转换后的坐标为指定格式：经度,纬度;经度,纬度;
  const formatConvertedCoords = (coords) => {
    if (!coords || coords.length === 0) return '';
    return coords.map(coord => `${coord.x},${coord.y}`).join(';') + ';';
  };

  // 复制坐标到剪贴板
  const copyCoords = async () => {
    const formattedCoords = formatConvertedCoords(convertedCoords);
    if (!formattedCoords) return;

    try {
      await navigator.clipboard.writeText(formattedCoords);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = formattedCoords;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        setError('复制失败，请手动复制');
      }
      document.body.removeChild(textArea);
    }
  };

  // 调用服务端API进行坐标转换
  const convertCoords = async () => {
    if (!inputCoords.trim()) {
      setError('请输入坐标数据');
      return;
    }

    setLoading(true);
    setError('');
    setConvertedCoords([]);
    setCopied(false);

    try {
      // 调用服务端API进行坐标转换
      const response = await fetch('/api/convert-coords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coords: inputCoords.trim()
        })
      });

      const data = await response.json();

      if (data.success && data.result && data.result.length > 0) {
        setConvertedCoords(data.result);
        setError('');
      } else {
        setError(data.error || '转换失败');
      }
    } catch (err) {
      setError(`转换失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* 地图容器 - 铺满整个屏幕 */}
      <div
        ref={mapRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* 右侧固定输入面板 */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-10 overflow-y-auto">
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-bold mb-4">
            高德地图坐标转百度地图坐标工具
          </h1>

          <div>
            <label htmlFor="coords-input" className="block text-sm font-medium mb-2">
              请输入高德坐标轮廓：
            </label>
            <textarea
              id="coords-input"
              value={inputCoords}
              onChange={(e) => setInputCoords(e.target.value)}
              placeholder="格式示例：121.081369,29.266251_121.081305,29.264978_..."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>

          <button
            onClick={convertCoords}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '转换中...' : '转换坐标'}
          </button>

          {error && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {convertedCoords.length > 0 && (
            <>
              <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg dark:bg-green-900 dark:border-green-700 dark:text-green-200">
                <p className="font-medium mb-2">转换成功！</p>
                <p className="text-sm">共转换 {convertedCoords.length} 个坐标点</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    转换后的百度坐标：
                  </label>
                  <button
                    onClick={copyCoords}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        已复制
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        一键复制
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={formatConvertedCoords(convertedCoords)}
                  className="w-full h-48 p-4 border border-gray-300 rounded-lg resize-none bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

