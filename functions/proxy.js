exports.handler = async function (event, context) {
  const startTime = Date.now();
  try {
    // Lấy URL từ query string
    const targetUrl = event.queryStringParameters?.url;
    if (!targetUrl) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing url parameter' }),
      };
    }

    // Gửi yêu cầu đến API đích
    const response = await fetch(decodeURIComponent(targetUrl), {
      method: event.httpMethod,
      headers: { 'Content-Type': 'application/json' },
      body: event.body || undefined,
    });

    // Kiểm tra phản hồi
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Proxy request to ${targetUrl} took ${Date.now() - startTime}ms`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: error.response?.status || 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: `Error fetching data from API: ${error.message}` }),
    };
  }
};
