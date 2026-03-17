#!/usr/bin/env node

const https = require('https');

async function testSpecificAPIs() {
  console.log('🚀 Testing Specific API Endpoints...\n');

  // Test endpoints that are failing
  const endpoints = [
    '/api/pos-machines',
    '/api/transactions?type=receipt',
    '/api/transactions?limit=5'
  ];

  console.log('Step 1: Login to get auth token...');
  
  const loginData = JSON.stringify({
    email: 'admin@dsrpro.ae',
    password: 'admin123'
  });

  try {
    const loginResponse = await makeRequest({
      hostname: 'dsrpro.vercel.app',
      port: 443,
      path: '/api/auth/signin',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, loginData);

    console.log('✅ Login successful\n');
    
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      console.log(`Testing: ${endpoint}`);
      
      try {
        const response = await makeRequest({
          hostname: 'dsrpro.vercel.app',
          port: 443,
          path: endpoint,
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${endpoint} - SUCCESS`);
        console.log(`   Status: ${response.statusCode}`);
        if (response.data.error) {
          console.log(`   Error: ${response.data.error}`);
        } else {
          console.log(`   Data keys: ${Object.keys(response.data).join(', ')}`);
        }
        
      } catch (error) {
        console.log(`❌ ${endpoint} - FAILED`);
        console.log(`   Error: ${error.message}`);
        if (error.data) {
          console.log(`   Details: ${JSON.stringify(error.data, null, 2)}`);
        }
      }
      console.log('');
    }
    
    // Test the comprehensive test endpoint
    console.log('Testing comprehensive test endpoint...');
    try {
      const testResponse = await makeRequest({
        hostname: 'dsrpro.vercel.app',
        port: 443,
        path: '/api/test',
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ /api/test - SUCCESS');
      console.log('📊 Comprehensive Test Results:');
      console.log(JSON.stringify(testResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ /api/test - FAILED');
      console.log(`Error: ${error.message}`);
      if (error.data) {
        console.log('Details:', JSON.stringify(error.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    if (error.data) {
      console.error('Login error details:', JSON.stringify(error.data, null, 2));
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
          reject(new Error(`Failed to parse response: ${body.substring(0, 200)}...`));
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
testSpecificAPIs();