// Simple test to identify the issue
const testData = {
  segment: 'sdfdsfdsf',
  brand: 'Network',
  terminalId: 'SDF453543',
  merchantId: 'd345dfdsf',
  deviceType: 'traditional_pos',
  assignedAgent: '69aed88bb4bc05e2078a350a',
  location: 'efgs',
  bankCharges: 1.75,
  vatPercentage: 5,
  commissionPercentage: 1.75,
  status: 'active',
  notes: 'fdsvdgf',
  serialNumber: '',
  model: ''
};

console.log('=== ANALYZING TEST DATA ===');
console.log('Data to be sent:', JSON.stringify(testData, null, 2));

// Check for potential issues
console.log('\\n=== POTENTIAL ISSUES ===');

// 1. Check terminal ID format
const terminalId = testData.terminalId.trim().toUpperCase();
const isValidFormat = /^[A-Z0-9]+$/.test(terminalId);
console.log(`Terminal ID: "${testData.terminalId}" -> "${terminalId}"`);
console.log(`Valid format: ${isValidFormat}`);

// 2. Check required fields
const requiredFields = ['segment', 'brand', 'terminalId', 'merchantId', 'deviceType'];
const missingFields = requiredFields.filter(field => !testData[field]);
console.log(`Missing required fields: ${missingFields.length > 0 ? missingFields.join(', ') : 'None'}`);

// 3. Check enum values
const validBrands = ['Network', 'RAKBank', 'Geidea', 'AFS', 'Other'];
const validDeviceTypes = ['android_pos', 'traditional_pos'];
const validStatuses = ['active', 'inactive', 'maintenance'];

console.log(`Brand "${testData.brand}" valid: ${validBrands.includes(testData.brand)}`);
console.log(`Device type "${testData.deviceType}" valid: ${validDeviceTypes.includes(testData.deviceType)}`);
console.log(`Status "${testData.status}" valid: ${validStatuses.includes(testData.status)}`);

// 4. Check numeric values
console.log(`Bank charges: ${testData.bankCharges} (valid: ${testData.bankCharges >= 0})`);
console.log(`VAT percentage: ${testData.vatPercentage} (valid: ${testData.vatPercentage >= 0 && testData.vatPercentage <= 100})`);
console.log(`Commission percentage: ${testData.commissionPercentage} (valid: ${testData.commissionPercentage >= 0 && testData.commissionPercentage <= 100})`);

// 5. Check ObjectId format
const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(testData.assignedAgent);
console.log(`Assigned agent ID "${testData.assignedAgent}" valid ObjectId: ${isValidObjectId}`);

console.log('\\n=== RECOMMENDATIONS ===');
if (!isValidFormat) {
  console.log('❌ Terminal ID format is invalid - contains non-alphanumeric characters');
} else {
  console.log('✅ Terminal ID format is valid');
}

if (missingFields.length > 0) {
  console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
} else {
  console.log('✅ All required fields are present');
}

if (!isValidObjectId) {
  console.log('❌ Assigned agent ID is not a valid ObjectId format');
} else {
  console.log('✅ Assigned agent ID format is valid');
}

console.log('\\n=== CURL COMMAND FOR TESTING ===');
console.log('You can test this directly with curl:');
console.log('');
console.log(`curl -X POST https://dsrpro.vercel.app/api/pos-machines \\\\`);
console.log(`  -H "Content-Type: application/json" \\\\`);
console.log(`  -H "Cookie: token=YOUR_JWT_TOKEN" \\\\`);
console.log(`  -d '${JSON.stringify(testData)}'`);
console.log('');
console.log('Replace YOUR_JWT_TOKEN with your actual JWT token from browser cookies.');

console.log('\\n=== NEXT STEPS ===');
console.log('1. Check the Vercel function logs for detailed error information');
console.log('2. The updated API now provides more detailed error logging');
console.log('3. Try the request again and check the browser network tab for detailed error response');
console.log('4. If still failing, the issue might be a database constraint we haven\'t identified yet');