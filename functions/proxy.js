const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // Cache 10 phút

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

    // Kiểm tra cache
    const cacheKey = `${event.httpMethod}:${targetUrl}`;
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log(`Cache hit for ${cacheKey}`);
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify(cachedResponse),
      };
    }

    // Gửi yêu cầu đến API đích
    const response = await axios({
      method: event.httpMethod,
      url: decodeURIComponent(targetUrl),
      data: event.body ? JSON.parse(event.body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    });

    // Lưu vào cache
    cache.set(cacheKey, response.data);
    console.log(`Proxy request to ${targetUrl} took ${Date.now() - startTime}ms`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(response.data),
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
