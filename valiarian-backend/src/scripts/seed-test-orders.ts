import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {OrderRepository, ProductRepository, UsersRepository} from '../repositories';

/**
 * Script to seed test orders for development and testing
 * Run with: npm run seed:test-orders
 */

const TEST_EMAIL = 'girasepratiksing@gmail.com';

async function seedTestOrders() {
  const app = new ValiarianBackendApplication();
  await app.boot();

  const orderRepository = await app.getRepository(OrderRepository);
  const userRepository = await app.getRepository(UsersRepository);
  const productRepository = await app.getRepository(ProductRepository);

  try {
    console.log('🚀 Starting test order seeding...\n');

    // Find or create test user
    let testUser = await userRepository.findOne({
      where: {email: TEST_EMAIL},
    });

    if (!testUser) {
      console.log(`📝 Test user not found. Creating user with email: ${TEST_EMAIL}...`);

      // Create test user
      testUser = await userRepository.create({
        id: uuidv4(),
        fullName: 'Pratik Girase',
        email: TEST_EMAIL,
        phone: '+919876543210',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz', // Hashed password placeholder
        isEmailVerified: true,
        isMobileVerified: true,
        isActive: true,
        isDeleted: false,
      });

      console.log(`✅ Test user created: ${testUser.email} (ID: ${testUser.id})\n`);
    } else {
      console.log(`✅ Found existing test user: ${testUser.email} (ID: ${testUser.id})\n`);
    }

    // Get some products
    let products = await productRepository.find({
      limit: 5,
      where: {status: 'published'},
    });

    // If no published products, try to get any products
    if (products.length === 0) {
      console.log('⚠️  No published products found. Looking for any products...');
      products = await productRepository.find({
        limit: 5,
      });
    }

    if (products.length === 0) {
      console.log('❌ No products found in database. Please seed products first:');
      console.log('   npm run seed:50products');
      return;
    }

    console.log(`✅ Found ${products.length} products\n`);

    const testAddress = {
      fullName: 'Pratik Girase',
      phone: '+919876543210',
      email: TEST_EMAIL,
      address: '123 MG Road, Near City Mall',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      country: 'India',
    };

    // Create Order 1: Pending Payment
    console.log('📦 Creating Order 1: Pending Payment...');
    const order1Items = [
      {
        id: uuidv4(),
        productId: products[0].id,
        name: products[0].name,
        image: products[0].coverImage || '',
        sku: products[0].sku || 'SKU001',
        quantity: 2,
        price: products[0].price,
        subtotal: products[0].price * 2,
      },
    ];
    const order1Subtotal = order1Items.reduce((sum, item) => sum + item.subtotal, 0);
    const order1Shipping = 50;
    const order1Tax = Math.round(order1Subtotal * 0.18);
    const order1Total = order1Subtotal + order1Shipping + order1Tax;

    const order1 = await orderRepository.create({
      id: uuidv4(),
      userId: testUser.id,
      orderNumber: `ORD${Date.now()}`,
      items: order1Items,
      subtotal: order1Subtotal,
      discount: 0,
      shipping: order1Shipping,
      tax: order1Tax,
      total: order1Total,
      currency: 'INR',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'razorpay',
      billingAddress: testAddress,
      shippingAddress: testAddress,
      razorpayOrderId: `order_${Date.now()}`,
      isDeleted: false,
    });
    console.log(`✅ Order 1 created: ${order1.orderNumber} (Pending Payment)\n`);

    // Create Order 2: Confirmed and Processing
    console.log('📦 Creating Order 2: Confirmed and Processing...');
    const order2Items = [
      {
        id: uuidv4(),
        productId: products[1].id,
        name: products[1].name,
        image: products[1].coverImage || '',
        sku: products[1].sku || 'SKU002',
        quantity: 1,
        price: products[1].price,
        subtotal: products[1].price,
      },
      {
        id: uuidv4(),
        productId: products[2].id,
        name: products[2].name,
        image: products[2].coverImage || '',
        sku: products[2].sku || 'SKU003',
        quantity: 3,
        price: products[2].price,
        subtotal: products[2].price * 3,
      },
    ];
    const order2Subtotal = order2Items.reduce((sum, item) => sum + item.subtotal, 0);
    const order2Discount = 100;
    const order2Shipping = 50;
    const order2Tax = Math.round((order2Subtotal - order2Discount) * 0.18);
    const order2Total = order2Subtotal - order2Discount + order2Shipping + order2Tax;

    const order2 = await orderRepository.create({
      id: uuidv4(),
      userId: testUser.id,
      orderNumber: `ORD${Date.now() + 1}`,
      items: order2Items,
      subtotal: order2Subtotal,
      discount: order2Discount,
      shipping: order2Shipping,
      tax: order2Tax,
      total: order2Total,
      currency: 'INR',
      status: 'processing',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      billingAddress: testAddress,
      shippingAddress: testAddress,
      razorpayOrderId: `order_${Date.now() + 1}`,
      razorpayPaymentId: `pay_${Date.now() + 1}`,
      razorpaySignature: 'test_signature',
      isDeleted: false,
    });
    console.log(`✅ Order 2 created: ${order2.orderNumber} (Processing)\n`);

    // Create Order 3: Shipped
    console.log('📦 Creating Order 3: Shipped...');
    const order3Items = [
      {
        id: uuidv4(),
        productId: products[3].id,
        name: products[3].name,
        image: products[3].coverImage || '',
        sku: products[3].sku || 'SKU004',
        quantity: 1,
        price: products[3].price,
        subtotal: products[3].price,
      },
    ];
    const order3Subtotal = order3Items.reduce((sum, item) => sum + item.subtotal, 0);
    const order3Shipping = 50;
    const order3Tax = Math.round(order3Subtotal * 0.18);
    const order3Total = order3Subtotal + order3Shipping + order3Tax;

    const order3 = await orderRepository.create({
      id: uuidv4(),
      userId: testUser.id,
      orderNumber: `ORD${Date.now() + 2}`,
      items: order3Items,
      subtotal: order3Subtotal,
      discount: 0,
      shipping: order3Shipping,
      tax: order3Tax,
      total: order3Total,
      currency: 'INR',
      status: 'shipped',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      billingAddress: testAddress,
      shippingAddress: testAddress,
      razorpayOrderId: `order_${Date.now() + 2}`,
      razorpayPaymentId: `pay_${Date.now() + 2}`,
      razorpaySignature: 'test_signature',
      trackingNumber: 'TRACK123456789',
      carrier: 'BlueDart',
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isDeleted: false,
    });
    console.log(`✅ Order 3 created: ${order3.orderNumber} (Shipped)\n`);

    // Create Order 4: Delivered
    console.log('📦 Creating Order 4: Delivered...');
    const order4Items = [
      {
        id: uuidv4(),
        productId: products[4].id,
        name: products[4].name,
        image: products[4].coverImage || '',
        sku: products[4].sku || 'SKU005',
        quantity: 2,
        price: products[4].price,
        subtotal: products[4].price * 2,
      },
    ];
    const order4Subtotal = order4Items.reduce((sum, item) => sum + item.subtotal, 0);
    const order4Shipping = 50;
    const order4Tax = Math.round(order4Subtotal * 0.18);
    const order4Total = order4Subtotal + order4Shipping + order4Tax;

    const order4 = await orderRepository.create({
      id: uuidv4(),
      userId: testUser.id,
      orderNumber: `ORD${Date.now() + 3}`,
      items: order4Items,
      subtotal: order4Subtotal,
      discount: 0,
      shipping: order4Shipping,
      tax: order4Tax,
      total: order4Total,
      currency: 'INR',
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'cod',
      billingAddress: testAddress,
      shippingAddress: testAddress,
      trackingNumber: 'TRACK987654321',
      carrier: 'DTDC',
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      isDeleted: false,
    });
    console.log(`✅ Order 4 created: ${order4.orderNumber} (Delivered - COD)\n`);

    // Create Order 5: Cancelled
    console.log('📦 Creating Order 5: Cancelled...');
    const order5Items = [
      {
        id: uuidv4(),
        productId: products[0].id,
        name: products[0].name,
        image: products[0].coverImage || '',
        sku: products[0].sku || 'SKU001',
        quantity: 1,
        price: products[0].price,
        subtotal: products[0].price,
      },
    ];
    const order5Subtotal = order5Items.reduce((sum, item) => sum + item.subtotal, 0);
    const order5Shipping = 50;
    const order5Tax = Math.round(order5Subtotal * 0.18);
    const order5Total = order5Subtotal + order5Shipping + order5Tax;

    const order5 = await orderRepository.create({
      id: uuidv4(),
      userId: testUser.id,
      orderNumber: `ORD${Date.now() + 4}`,
      items: order5Items,
      subtotal: order5Subtotal,
      discount: 0,
      shipping: order5Shipping,
      tax: order5Tax,
      total: order5Total,
      currency: 'INR',
      status: 'cancelled',
      paymentStatus: 'refunded',
      paymentMethod: 'razorpay',
      billingAddress: testAddress,
      shippingAddress: testAddress,
      razorpayOrderId: `order_${Date.now() + 4}`,
      razorpayPaymentId: `pay_${Date.now() + 4}`,
      razorpaySignature: 'test_signature',
      cancelledAt: new Date(),
      cancellationReason: 'Changed my mind',
      refundAmount: order5Total,
      refundInitiatedAt: new Date(),
      refundCompletedAt: new Date(),
      refundTransactionId: `rfnd_${Date.now()}`,
      isDeleted: false,
    });
    console.log(`✅ Order 5 created: ${order5.orderNumber} (Cancelled with Refund)\n`);

    // Create Order 6: Delivered with Return Request
    console.log('📦 Creating Order 6: Delivered with Return Request...');
    const order6Items = [
      {
        id: uuidv4(),
        productId: products[1].id,
        name: products[1].name,
        image: products[1].coverImage || '',
        sku: products[1].sku || 'SKU002',
        quantity: 1,
        price: products[1].price,
        subtotal: products[1].price,
      },
    ];
    const order6Subtotal = order6Items.reduce((sum, item) => sum + item.subtotal, 0);
    const order6Shipping = 50;
    const order6Tax = Math.round(order6Subtotal * 0.18);
    const order6Total = order6Subtotal + order6Shipping + order6Tax;

    const order6 = await orderRepository.create({
      id: uuidv4(),
      userId: testUser.id,
      orderNumber: `ORD${Date.now() + 5}`,
      items: order6Items,
      subtotal: order6Subtotal,
      discount: 0,
      shipping: order6Shipping,
      tax: order6Tax,
      total: order6Total,
      currency: 'INR',
      status: 'delivered',
      paymentStatus: 'paid',
      paymentMethod: 'razorpay',
      billingAddress: testAddress,
      shippingAddress: testAddress,
      razorpayOrderId: `order_${Date.now() + 5}`,
      razorpayPaymentId: `pay_${Date.now() + 5}`,
      razorpaySignature: 'test_signature',
      trackingNumber: 'TRACK555666777',
      carrier: 'FedEx',
      deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      returnStatus: 'requested',
      returnInitiatedAt: new Date(),
      returnReason: 'Product not as expected',
      isDeleted: false,
    });
    console.log(
      `✅ Order 6 created: ${order6.orderNumber} (Delivered with Return Request)\n`,
    );

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TEST ORDERS CREATED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n👤 Test User: ${TEST_EMAIL}`);
    console.log('\n📦 Orders created:');
    console.log(`  1. ${order1.orderNumber} - Pending Payment`);
    console.log(`  2. ${order2.orderNumber} - Processing (Paid)`);
    console.log(`  3. ${order3.orderNumber} - Shipped`);
    console.log(`  4. ${order4.orderNumber} - Delivered (COD)`);
    console.log(`  5. ${order5.orderNumber} - Cancelled (Refunded)`);
    console.log(`  6. ${order6.orderNumber} - Delivered (Return Requested)`);
    console.log('\n💡 You can now:');
    console.log('  - View these orders in the admin panel');
    console.log('  - Test order management features');
    console.log('  - Update order statuses');
    console.log('  - Process returns and refunds');
  } catch (error) {
    console.error('❌ Error seeding test orders:', error);
    throw error;
  } finally {
    await app.stop();
  }
}

seedTestOrders()
  .then(() => {
    console.log('\n✅ Test order seeding completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Test order seeding failed:', err);
    process.exit(1);
  });
