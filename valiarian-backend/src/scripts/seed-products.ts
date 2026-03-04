import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {ProductRepository} from '../repositories';

/**
 * Seed Product Data
 * This script creates sample products for the e-commerce system
 */
export async function seedProducts(app: ValiarianBackendApplication) {
  const productRepo = await app.getRepository(ProductRepository);

  console.log('🌱 Starting product seeding...');

  try {
    // Check if products already exist
    const existingProducts = await productRepo.count();
    if (existingProducts.count > 0) {
      console.log(`⚠️  ${existingProducts.count} products already exist. Skipping...`);
      return;
    }

    const now = new Date();
    const products = [];

    // Product 1: Premium Cotton Polo - Navy Blue (New Arrival, Featured, On Sale)
    products.push({
      id: uuidv4(),
      name: 'Premium Cotton Polo - Navy Blue',
      slug: 'premium-cotton-polo-navy-blue',
      description: 'Classic navy blue polo shirt made from 100% premium long-staple cotton. Features a modern slim fit, reinforced collar, and mother-of-pearl buttons. Perfect for both casual and business casual settings.',
      shortDescription: 'Classic navy blue polo with premium cotton',
      price: 1299,
      salePrice: 999,
      saleStartDate: now,
      saleEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      coverImage: '/assets/images/products/polo-navy-1.jpg',
      images: ['/assets/images/products/polo-navy-1.jpg', '/assets/images/products/polo-navy-2.jpg', '/assets/images/products/polo-navy-3.jpg'],
      colors: ['#000080', '#FFFFFF', '#808080'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      stockQuantity: 50,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: true,
      isBestSeller: false,
      isFeatured: true,
      newArrivalStartDate: now,
      newArrivalEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      categories: ['Polo Shirts', 'Men', 'New Arrivals'],
      tags: ['cotton', 'casual', 'premium', 'navy'],
      status: 'published',
      seoTitle: 'Premium Cotton Polo - Navy Blue | Valiarian',
      seoDescription: 'Shop our premium navy blue cotton polo shirt. Made from 100% long-staple cotton for ultimate comfort.',
      seoKeywords: ['polo shirt', 'navy blue', 'cotton', 'premium', 'men'],
      sku: 'POLO-NAVY-001',
      soldCount: 45,
      viewCount: 230,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 2: Classic White Polo (New Arrival, Best Seller, Featured)
    products.push({
      id: uuidv4(),
      name: 'Classic White Polo Shirt',
      slug: 'classic-white-polo-shirt',
      description: 'Timeless white polo shirt crafted from breathable premium cotton. Features a classic fit with ribbed collar and cuffs. A wardrobe essential that pairs perfectly with any outfit.',
      shortDescription: 'Timeless white polo with classic fit',
      price: 1199,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-white-1.jpg',
      images: ['/assets/images/products/polo-white-1.jpg', '/assets/images/products/polo-white-2.jpg'],
      colors: ['#FFFFFF', '#F5F5F5'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      stockQuantity: 75,
      trackInventory: true,
      lowStockThreshold: 15,
      inStock: true,
      isNewArrival: true,
      isBestSeller: true,
      isFeatured: true,
      newArrivalStartDate: now,
      newArrivalEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      categories: ['Polo Shirts', 'Men', 'Bestsellers'],
      tags: ['cotton', 'white', 'classic', 'essential'],
      status: 'published',
      seoTitle: 'Classic White Polo Shirt | Valiarian',
      seoDescription: 'Essential white polo shirt made from premium cotton. Perfect for any occasion.',
      seoKeywords: ['white polo', 'classic', 'cotton', 'men', 'essential'],
      sku: 'POLO-WHITE-001',
      soldCount: 120,
      viewCount: 450,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 3: Charcoal Grey Performance Polo (New Arrival)
    products.push({
      id: uuidv4(),
      name: 'Charcoal Grey Performance Polo',
      slug: 'charcoal-grey-performance-polo',
      description: 'Modern charcoal grey polo with moisture-wicking technology. Engineered for active lifestyles with four-way stretch fabric and anti-odor treatment. Perfect for sports and casual wear.',
      shortDescription: 'Performance polo with moisture-wicking tech',
      price: 1499,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-grey-1.jpg',
      images: ['/assets/images/products/polo-grey-1.jpg', '/assets/images/products/polo-grey-2.jpg', '/assets/images/products/polo-grey-3.jpg'],
      colors: ['#36454F', '#000000', '#708090'],
      sizes: ['S', 'M', 'L', 'XL'],
      stockQuantity: 40,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: true,
      isBestSeller: false,
      isFeatured: false,
      newArrivalStartDate: now,
      newArrivalEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      categories: ['Polo Shirts', 'Men', 'Performance'],
      tags: ['performance', 'grey', 'sports', 'moisture-wicking'],
      status: 'published',
      seoTitle: 'Charcoal Grey Performance Polo | Valiarian',
      seoDescription: 'High-performance polo with moisture-wicking technology. Perfect for active lifestyles.',
      seoKeywords: ['performance polo', 'grey', 'sports', 'moisture-wicking'],
      sku: 'POLO-GREY-001',
      soldCount: 32,
      viewCount: 180,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 4: Black Essential Polo (Best Seller, Featured, On Sale)
    products.push({
      id: uuidv4(),
      name: 'Black Essential Polo',
      slug: 'black-essential-polo',
      description: 'Versatile black polo shirt that goes with everything. Made from soft, breathable cotton with a modern fit. Features reinforced seams and fade-resistant dye for long-lasting wear.',
      shortDescription: 'Versatile black polo for everyday wear',
      price: 1199,
      salePrice: 899,
      saleStartDate: now,
      saleEndDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      coverImage: '/assets/images/products/polo-black-1.jpg',
      images: ['/assets/images/products/polo-black-1.jpg', '/assets/images/products/polo-black-2.jpg'],
      colors: ['#000000', '#1C1C1C'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      stockQuantity: 90,
      trackInventory: true,
      lowStockThreshold: 20,
      inStock: true,
      isNewArrival: false,
      isBestSeller: true,
      isFeatured: true,
      categories: ['Polo Shirts', 'Men', 'Bestsellers'],
      tags: ['black', 'essential', 'versatile', 'cotton'],
      status: 'published',
      seoTitle: 'Black Essential Polo | Valiarian',
      seoDescription: 'Versatile black polo shirt for everyday wear. Premium cotton with modern fit.',
      seoKeywords: ['black polo', 'essential', 'cotton', 'men'],
      sku: 'POLO-BLACK-001',
      soldCount: 156,
      viewCount: 520,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 5: Burgundy Premium Polo (Best Seller)
    products.push({
      id: uuidv4(),
      name: 'Burgundy Premium Polo',
      slug: 'burgundy-premium-polo',
      description: 'Rich burgundy polo shirt that adds sophistication to any outfit. Crafted from premium pique cotton with a textured finish. Features a classic collar and three-button placket.',
      shortDescription: 'Sophisticated burgundy polo with textured finish',
      price: 1399,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-burgundy-1.jpg',
      images: ['/assets/images/products/polo-burgundy-1.jpg', '/assets/images/products/polo-burgundy-2.jpg', '/assets/images/products/polo-burgundy-3.jpg'],
      colors: ['#800020', '#8B0000', '#A52A2A'],
      sizes: ['S', 'M', 'L', 'XL'],
      stockQuantity: 55,
      trackInventory: true,
      lowStockThreshold: 12,
      inStock: true,
      isNewArrival: false,
      isBestSeller: true,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Bestsellers'],
      tags: ['burgundy', 'premium', 'sophisticated', 'pique'],
      status: 'published',
      seoTitle: 'Burgundy Premium Polo | Valiarian',
      seoDescription: 'Sophisticated burgundy polo with premium pique cotton. Perfect for smart casual occasions.',
      seoKeywords: ['burgundy polo', 'premium', 'pique cotton', 'men'],
      sku: 'POLO-BURG-001',
      soldCount: 98,
      viewCount: 380,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 6: Forest Green Polo
    products.push({
      id: uuidv4(),
      name: 'Forest Green Polo Shirt',
      slug: 'forest-green-polo-shirt',
      description: 'Deep forest green polo that brings a touch of nature to your wardrobe. Made from eco-friendly organic cotton with sustainable dyes. Features a relaxed fit and soft hand feel.',
      shortDescription: 'Eco-friendly forest green polo',
      price: 1299,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-green-1.jpg',
      images: ['/assets/images/products/polo-green-1.jpg', '/assets/images/products/polo-green-2.jpg'],
      colors: ['#228B22', '#2E8B57', '#006400'],
      sizes: ['M', 'L', 'XL', 'XXL'],
      stockQuantity: 35,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Eco-Friendly'],
      tags: ['green', 'organic', 'eco-friendly', 'sustainable'],
      status: 'published',
      seoTitle: 'Forest Green Organic Polo | Valiarian',
      seoDescription: 'Eco-friendly forest green polo made from organic cotton. Sustainable fashion choice.',
      seoKeywords: ['green polo', 'organic cotton', 'eco-friendly', 'sustainable'],
      sku: 'POLO-GREEN-001',
      soldCount: 28,
      viewCount: 145,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 7: Sky Blue Casual Polo (Featured, On Sale)
    products.push({
      id: uuidv4(),
      name: 'Sky Blue Casual Polo',
      slug: 'sky-blue-casual-polo',
      description: 'Light and breezy sky blue polo perfect for summer days. Made from lightweight cotton blend with UV protection. Features a modern slim fit and contrast tipping on collar.',
      shortDescription: 'Light sky blue polo for summer',
      price: 1099,
      salePrice: 849,
      saleStartDate: now,
      saleEndDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      coverImage: '/assets/images/products/polo-blue-1.jpg',
      images: ['/assets/images/products/polo-blue-1.jpg', '/assets/images/products/polo-blue-2.jpg'],
      colors: ['#87CEEB', '#4682B4', '#6495ED'],
      sizes: ['S', 'M', 'L', 'XL'],
      stockQuantity: 60,
      trackInventory: true,
      lowStockThreshold: 15,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: true,
      categories: ['Polo Shirts', 'Men', 'Summer'],
      tags: ['blue', 'summer', 'lightweight', 'casual'],
      status: 'published',
      seoTitle: 'Sky Blue Casual Polo | Valiarian',
      seoDescription: 'Light and breezy sky blue polo perfect for summer. UV protection included.',
      seoKeywords: ['blue polo', 'summer', 'lightweight', 'casual'],
      sku: 'POLO-BLUE-001',
      soldCount: 67,
      viewCount: 290,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 8: Heather Grey Polo
    products.push({
      id: uuidv4(),
      name: 'Heather Grey Polo',
      slug: 'heather-grey-polo',
      description: 'Stylish heather grey polo with a modern marled texture. Crafted from a cotton-polyester blend for easy care and wrinkle resistance. Perfect for travel and everyday wear.',
      shortDescription: 'Modern heather grey with marled texture',
      price: 1249,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-heather-1.jpg',
      images: ['/assets/images/products/polo-heather-1.jpg', '/assets/images/products/polo-heather-2.jpg'],
      colors: ['#C0C0C0', '#A9A9A9', '#808080'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      stockQuantity: 45,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men'],
      tags: ['grey', 'heather', 'travel', 'easy-care'],
      status: 'published',
      seoTitle: 'Heather Grey Polo | Valiarian',
      seoDescription: 'Stylish heather grey polo with modern texture. Easy care and wrinkle resistant.',
      seoKeywords: ['heather grey', 'polo', 'easy care', 'travel'],
      sku: 'POLO-HEATH-001',
      soldCount: 41,
      viewCount: 195,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 9: Olive Green Military Polo
    products.push({
      id: uuidv4(),
      name: 'Olive Green Military Polo',
      slug: 'olive-green-military-polo',
      description: 'Rugged olive green polo inspired by military styling. Made from durable cotton twill with reinforced stitching. Features utility pocket detail and button-down collar.',
      shortDescription: 'Military-inspired olive green polo',
      price: 1399,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-olive-1.jpg',
      images: ['/assets/images/products/polo-olive-1.jpg', '/assets/images/products/polo-olive-2.jpg', '/assets/images/products/polo-olive-3.jpg'],
      colors: ['#808000', '#6B8E23', '#556B2F'],
      sizes: ['M', 'L', 'XL', 'XXL'],
      stockQuantity: 30,
      trackInventory: true,
      lowStockThreshold: 8,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Military'],
      tags: ['olive', 'military', 'rugged', 'utility'],
      status: 'published',
      seoTitle: 'Olive Green Military Polo | Valiarian',
      seoDescription: 'Rugged olive green polo with military styling. Durable cotton twill construction.',
      seoKeywords: ['olive polo', 'military style', 'rugged', 'utility'],
      sku: 'POLO-OLIVE-001',
      soldCount: 22,
      viewCount: 128,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 10: Coral Pink Polo
    products.push({
      id: uuidv4(),
      name: 'Coral Pink Polo Shirt',
      slug: 'coral-pink-polo-shirt',
      description: 'Vibrant coral pink polo that adds a pop of color to your wardrobe. Made from soft combed cotton with a smooth finish. Features a contemporary fit and tonal buttons.',
      shortDescription: 'Vibrant coral pink polo',
      price: 1199,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-coral-1.jpg',
      images: ['/assets/images/products/polo-coral-1.jpg', '/assets/images/products/polo-coral-2.jpg'],
      colors: ['#FF7F50', '#FF6347', '#FA8072'],
      sizes: ['S', 'M', 'L', 'XL'],
      stockQuantity: 25,
      trackInventory: true,
      lowStockThreshold: 8,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Colorful'],
      tags: ['coral', 'pink', 'vibrant', 'colorful'],
      status: 'published',
      seoTitle: 'Coral Pink Polo Shirt | Valiarian',
      seoDescription: 'Vibrant coral pink polo made from soft combed cotton. Add color to your wardrobe.',
      seoKeywords: ['coral polo', 'pink', 'vibrant', 'colorful'],
      sku: 'POLO-CORAL-001',
      soldCount: 18,
      viewCount: 95,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 11: Mustard Yellow Polo (Low Stock, On Sale)
    products.push({
      id: uuidv4(),
      name: 'Mustard Yellow Polo',
      slug: 'mustard-yellow-polo',
      description: 'Bold mustard yellow polo that makes a statement. Crafted from premium cotton with a vintage-inspired fit. Features contrast stitching and retro-style buttons.',
      shortDescription: 'Bold mustard yellow statement polo',
      price: 1349,
      salePrice: 1049,
      saleStartDate: now,
      saleEndDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      currency: 'INR',
      coverImage: '/assets/images/products/polo-mustard-1.jpg',
      images: ['/assets/images/products/polo-mustard-1.jpg', '/assets/images/products/polo-mustard-2.jpg'],
      colors: ['#FFDB58', '#E1AD01', '#DAA520'],
      sizes: ['S', 'M', 'L'],
      stockQuantity: 8,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Vintage'],
      tags: ['mustard', 'yellow', 'vintage', 'bold'],
      status: 'published',
      seoTitle: 'Mustard Yellow Polo | Valiarian',
      seoDescription: 'Bold mustard yellow polo with vintage styling. Limited stock available.',
      seoKeywords: ['mustard polo', 'yellow', 'vintage', 'statement'],
      sku: 'POLO-MUST-001',
      soldCount: 34,
      viewCount: 167,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 12: Crimson Red Polo (Low Stock, Featured)
    products.push({
      id: uuidv4(),
      name: 'Crimson Red Polo',
      slug: 'crimson-red-polo',
      description: 'Eye-catching crimson red polo for those who dare to stand out. Made from premium mercerized cotton with a subtle sheen. Features a tailored fit and contrast collar lining.',
      shortDescription: 'Eye-catching crimson red polo',
      price: 1449,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-crimson-1.jpg',
      images: ['/assets/images/products/polo-crimson-1.jpg', '/assets/images/products/polo-crimson-2.jpg'],
      colors: ['#DC143C', '#B22222', '#8B0000'],
      sizes: ['M', 'L', 'XL'],
      stockQuantity: 5,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: true,
      categories: ['Polo Shirts', 'Men', 'Premium'],
      tags: ['crimson', 'red', 'premium', 'mercerized'],
      status: 'published',
      seoTitle: 'Crimson Red Premium Polo | Valiarian',
      seoDescription: 'Eye-catching crimson red polo with mercerized cotton. Limited availability.',
      seoKeywords: ['crimson polo', 'red', 'premium', 'mercerized cotton'],
      sku: 'POLO-CRIM-001',
      soldCount: 52,
      viewCount: 245,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 13: Navy & White Striped Polo (Best Seller)
    products.push({
      id: uuidv4(),
      name: 'Navy & White Striped Polo',
      slug: 'navy-white-striped-polo',
      description: 'Classic navy and white striped polo with nautical charm. Made from breathable cotton jersey with a relaxed fit. Features contrast collar and cuffs for added style.',
      shortDescription: 'Nautical navy and white striped polo',
      price: 1299,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-stripe-navy-1.jpg',
      images: ['/assets/images/products/polo-stripe-navy-1.jpg', '/assets/images/products/polo-stripe-navy-2.jpg'],
      colors: ['#000080', '#FFFFFF'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      stockQuantity: 42,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: false,
      isBestSeller: true,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Striped'],
      tags: ['striped', 'navy', 'nautical', 'classic'],
      status: 'published',
      seoTitle: 'Navy & White Striped Polo | Valiarian',
      seoDescription: 'Classic navy and white striped polo with nautical charm. Breathable cotton jersey.',
      seoKeywords: ['striped polo', 'navy', 'nautical', 'classic'],
      sku: 'POLO-STRIPE-001',
      soldCount: 88,
      viewCount: 340,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Product 14: Lavender Purple Polo (Draft - Not Published)
    products.push({
      id: uuidv4(),
      name: 'Lavender Purple Polo',
      slug: 'lavender-purple-polo',
      description: 'Soft lavender purple polo with a modern aesthetic. Made from ultra-soft Supima cotton. Features a contemporary slim fit and tonal embroidery.',
      shortDescription: 'Soft lavender polo with Supima cotton',
      price: 1599,
      salePrice: null,
      currency: 'INR',
      coverImage: '/assets/images/products/polo-lavender-1.jpg',
      images: ['/assets/images/products/polo-lavender-1.jpg'],
      colors: ['#E6E6FA', '#9370DB', '#8A2BE2'],
      sizes: ['S', 'M', 'L', 'XL'],
      stockQuantity: 40,
      trackInventory: true,
      lowStockThreshold: 10,
      inStock: true,
      isNewArrival: false,
      isBestSeller: false,
      isFeatured: false,
      categories: ['Polo Shirts', 'Men', 'Premium'],
      tags: ['lavender', 'purple', 'supima', 'premium'],
      status: 'draft',
      seoTitle: 'Lavender Purple Polo | Valiarian',
      seoDescription: 'Soft lavender purple polo made from Supima cotton. Coming soon.',
      seoKeywords: ['lavender polo', 'purple', 'supima cotton', 'premium'],
      sku: 'POLO-LAV-001',
      soldCount: 0,
      viewCount: 0,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Create all products
    for (const productData of products) {
      await productRepo.create(productData as any);
      console.log(`✅ Created product: ${productData.name} (${productData.status})`);
    }

    console.log('');
    console.log('🎉 Product seeding completed successfully!');
    console.log(`📦 Created ${products.length} products`);
    console.log('');
    console.log('Product Summary:');
    console.log(`- Published: ${products.filter(p => p.status === 'published').length}`);
    console.log(`- Draft: ${products.filter(p => p.status === 'draft').length}`);
    console.log(`- New Arrivals: ${products.filter(p => p.isNewArrival).length}`);
    console.log(`- Best Sellers: ${products.filter(p => p.isBestSeller).length}`);
    console.log(`- Featured: ${products.filter(p => p.isFeatured).length}`);
    console.log(`- On Sale: ${products.filter(p => p.salePrice).length}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Upload product images to media library');
    console.log('2. Update product image URLs in admin panel');
    console.log('3. Test product endpoints in API');
    console.log('4. Verify products display correctly on frontend');
  } catch (error) {
    console.error('❌ Error seeding products:', error);
    throw error;
  }
}

/**
 * Run the seed script
 */
async function run() {
  const config = {
    rest: {
      port: +(process.env.PORT ?? 3035),
      host: process.env.HOST,
      gracePeriodForClose: 5000,
      openApiSpec: {
        setServersFromRequest: true,
      },
    },
  };

  const app = new ValiarianBackendApplication(config);
  await app.boot();

  try {
    await seedProducts(app);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed products:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}
