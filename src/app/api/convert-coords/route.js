export async function POST(request) {
  try {
    const { coords } = await request.json();

    if (!coords || !coords.trim()) {
      return Response.json(
        { error: '坐标数据不能为空' },
        { status: 400 }
      );
    }

    // 百度地图API密钥
    const BAIDU_AK = process.env.BAIDU_AK;
    
    if (!BAIDU_AK) {
      return Response.json(
        { error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    // 格式化坐标：将下划线分隔转换为分号分隔
    // 用户输入格式：121.081369,29.266251_121.081305,29.264978
    // API需要格式：121.081369,29.266251;121.081305,29.264978
    const formattedCoords = coords.trim().replace(/_/g, ';');

    // 调用百度地图坐标转换API
    const url = `https://api.map.baidu.com/geoconv/v2/?coords=${encodeURIComponent(formattedCoords)}&model=1&ak=${BAIDU_AK}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 0 && data.result && data.result.length > 0) {
      return Response.json({
        success: true,
        result: data.result
      });
    } else {
      return Response.json(
        {
          success: false,
          error: `转换失败: ${data.status} - ${data.message || '未知错误'}`
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: `服务器错误: ${error.message}`
      },
      { status: 500 }
    );
  }
}

