#!/usr/bin/env node

const https = require('https');

async function testAPI() {
  console.log('🚀 Starting API Test...\n');

  // Step 1: Login to get auth token
  console.log('Step 1: Logging in...');
  
  const loginData = JSON.stringify({
    email: 'admin@dsrpro.ae',
    password: 'admin123'
  });

  const loginOptions = {
    hostname: 'dsrpro.vercel.app',
    port: 443,
    path: '/api/auth/signin',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  try {
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('✅ Login successful');
    
    // Extract cookies from login response
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    // Step 2: Test the API with auth
    console.log('\nStep 2: Testing API endpoints...');
    
    const testOptions = {
      hostname: 'dsrpro.vercel.app',
      port: 443,
      path: '/api/test',
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    };

    const testResponse = await makeRequest(testOptions);
    console.log('✅ API Test completed');
    console.log('\n📊 Test Results:');
    console.log(JSON.stringify(testResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${responseData.error || 'Request failed'}`);
            error.data = responseData;
            reject(error);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Run the test
testAPI();