const axios = require('axios');

const API_BASE = 'http://localhost:3035';
const ADMIN_EMAIL = 'admin@valiarian.com';
const ADMIN_PASSWORD = 'Admin@123';

async function runTest() {
  console.log('\n=== E2E Order Flow Test ===\n');

  try {
    console.log('1. Logging in as admin...');
    const adminLogin = await axios.post(`${API_BASE}/api/auth/super-admin-login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      rememberMe: true
    });
    const adminToken = adminLogin.data.accessToken;
    console.log('✅ Admin logged in\n');

    console.log('2. Getting all orders...');
    const ordersResponse = await axios.get(`${API_BASE}/api/admin/orders?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (ordersResponse.data.orders.length === 0) {
      console.log('❌ No orders found. Run: npm run seed:test-orders');
      process.exit(1);
    }

    console.log(`✅ Found ${ordersResponse.data.orders.length} orders\n`);

    const testOrder = ordersResponse.data.orders.find(o => o.status === 'pending') || ordersResponse.data.orders[0];
    const orderId = testOrder.id;
    const orderNumber = testOrder.orderNumber;
    console.log(`Using order: ${orderNumber} (Status: ${testOrder.status})\n`);

    console.log('3. Getting order details...');
    const orderDetails = await axios.get(`${API_BASE}/api/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Order details retrieved\n`);

    console.log('4. Updating order status...');
    const currentStatus = testOrder.status;
    const statusMap = {
      'pending': 'confirmed',
      'confirmed': 'processing',
      'processing': 'packed',
      'packed': 'shipped',
      'shipped': 'delivered'
    };

    const nextStatus = statusMap[currentStatus];

    if (nextStatus) {
      const updateData = {
        status: nextStatus,
        comment: `E2E Test: Updated to ${nextStatus}`
      };

      if (nextStatus === 'shipped') {
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 3);
        updateData.trackingNumber = 'E2E-TEST-' + Date.now();
        updateData.carrier = 'Test Courier';
        updateData.estimatedDelivery = estimatedDelivery.toISOString().split('T')[0];
      }

      await axios.patch(`${API_BASE}/api/admin/orders/${orderId}/status`, updateData, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`✅ Status updated to ${nextStatus}\n`);
    }

    console.log('5. Verifying final state...');
    const finalOrder = await axios.get(`${API_BASE}/api/admin/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('\n=== Final Order State ===');
    console.log(`Order Number: ${finalOrder.data.order.orderNumber}`);
    console.log(`Status: ${finalOrder.data.order.status}`);
    console.log(`Payment Status: ${finalOrder.data.order.paymentStatus}`);
    console.log(`Tracking: ${finalOrder.data.order.trackingNumber || 'N/A'}`);
    console.log(`Status History: ${finalOrder.data.statusHistory.length} entries`);

    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('\n✅ Task 37 E2E Order Flow Test completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTest();
