/**
 * Test script to verify admin orders API endpoint
 *
 * This script will:
 * 1. Login as super admin
 * 2. Fetch orders from admin endpoint
 * 3. Display results
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3035';

// Super admin credentials
const ADMIN_EMAIL = 'admin@valiarian.com';
const ADMIN_PASSWORD = 'Admin@123';

async function testAdminOrdersAPI() {
  console.log('🔍 Testing Admin Orders API...\n');

  try {
    // Step 1: Login as super admin
    console.log('Step 1: Logging in as super admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/super-admin-login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      rememberMe: true
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const accessToken = loginResponse.data.accessToken;
    console.log('✅ Login successful');
    console.log(`   User: ${loginResponse.data.user.email}`);
    console.log(`   Token: ${accessToken.substring(0, 20)}...`);
    console.log('');

    // Step 2: Fetch orders
    console.log('Step 2: Fetching orders from admin endpoint...');
    const ordersResponse = await axios.get(`${API_BASE}/api/admin/orders`, {
      params: {
        page: 1,
        limit: 20
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!ordersResponse.data.success) {
      throw new Error('Failed to fetch orders');
    }

    console.log('✅ Orders fetched successfully');
    console.log('');

    // Step 3: Display results
    const { orders, pagination } = ordersResponse.data;

    console.log('📊 Pagination Info:');
    console.log(`   Total Orders: ${pagination.total}`);
    console.log(`   Page: ${pagination.page} of ${pagination.totalPages}`);
    console.log(`   Limit: ${pagination.limit}`);
    console.log('');

    if (orders.length === 0) {
      console.log('⚠️  No orders found in database');
      console.log('   Run: npm run seed:test-orders (in valiarian-backend)');
    } else {
      console.log(`📦 Orders (${orders.length}):`);
      console.log('');

      orders.forEach((order, index) => {
        console.log(`${index + 1}. Order #${order.orderNumber}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Payment: ${order.paymentStatus}`);
        console.log(`   Total: ₹${order.total}`);
        console.log(`   Customer: ${order.user?.fullName || order.user?.email || 'N/A'}`);
        console.log(`   Created: ${new Date(order.createdAt).toLocaleString()}`);
        console.log('');
      });
    }

    console.log('✅ All tests passed!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Start admin panel: cd Valiarian-admin-panel && npm start');
    console.log('   2. Login with super admin credentials');
    console.log('   3. Navigate to Orders page');
    console.log('   4. Orders should now be visible');

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.error('');
        console.error('💡 Authentication failed. Possible reasons:');
        console.error('   1. Super admin account does not exist');
        console.error('   2. Wrong credentials');
        console.error('');
        console.error('   To create super admin:');
        console.error('   curl -X POST http://localhost:3035/api/auth/super-admin \\');
        console.error('     -H "Content-Type: application/json" \\');
        console.error('     -d \'{"fullName":"Admin User","email":"admin@valiarian.com","phone":"+1234567890","password":"Admin@123"}\'');
      } else if (error.response.status === 403) {
        console.error('');
        console.error('💡 Access denied. User does not have super_admin role.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('💡 Backend server is not running.');
      console.error('   Start it with: cd valiarian-backend && npm run dev');
    }

    process.exit(1);
  }
}

// Run the test
testAdminOrdersAPI();
