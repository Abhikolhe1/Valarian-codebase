import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {ProductRepository} from '../repositories';

export async function seed50Products(app: ValiarianBackendApplication) {
  const productRepo = await app.getRepository(ProductRepository);

  console.log('Starting 50-product seeding...');

  try {
    const now = new Date();
    const products = [];

    // Color palettes for each category
    const zipperColors = ['#000080', '#8B0000', '#2F4F4F', '#4B0082', '#8B4513'];
    const collarColors = ['#000000', '#FFFFFF', '#808080', '#1C1C1C', '#D3D3D3'];
    const vneckColors = ['#4169E1', '#32CD32', '#FF6347', '#FFD700', '#9370DB'];
    const roundNeckColors = ['#FF4500', '#00CED1', '#FF1493', '#7FFF00', '#FF8C00'];
    const henleyColors = ['#556B2F', '#8B4513', '#2F4F4F', '#696969', '#A0522D'];

    // Helper function to generate product
    const generateProduct = (
      index: number,
      category: string,
      colorName: string,
      colorHex: string,
      colorVariants: string[],
      basePrice: number,
      isNewArrival: boolean = false,
      isBestSeller: boolean = false,
      isFeatured: boolean = false,
      onSale: boolean = false
    ) => {
      const slug = category.toLowerCase().replace(/\s+/g, '-') + '-' + colorName.toLowerCase().replace(/\s+/g, '-') + '-' + index;
      const salePrice = onSale ? Math.round(basePrice * 0.75) : null;

      return {
        id: uuidv4(),
        name: colorName + ' ' + category,
        slug,
        description: 'Premium ' + colorName.toLowerCase() + ' ' + category.toLowerCase() + ' crafted from 100% high-quality cotton. Features modern fit, reinforced stitching, and superior comfort. Perfect for both casual and semi-formal occasions. Designed for durability and style.',
        shortDescription: 'Premium ' + colorName.toLowerCase() + ' ' + category.toLowerCase() + ' with modern fit',
        price: basePrice,
        salePrice,
        saleStartDate: onSale ? now : null,
        saleEndDate: onSale ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        currency: 'INR',
        coverImage: '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + colorName.toLowerCase() + '-1.jpg',
        images: [
          '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + colorName.toLowerCase() + '-1.jpg',
          '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + colorName.toLowerCase() + '-2.jpg',
        ],
        colors: colorVariants,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        stockQuantity: Math.floor(Math.random() * 80) + 20,
        trackInventory: true,
        lowStockThreshold: 10,
        inStock: true,
        isNewArrival,
        isBestSeller,
        isFeatured,
        newArrivalStartDate: isNewArrival ? now : null,
        newArrivalEndDate: isNewArrival ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) : null,
        categories: [category, 'Men'],
        tags: [colorName.toLowerCase(), category.toLowerCase().split(' ')[0], 'cotton', 'premium'],
        status: 'published',
        seoTitle: colorName + ' ' + category + ' | Valiarian',
        seoDescription: 'Shop our premium ' + colorName.toLowerCase() + ' ' + category.toLowerCase() + '. Made from 100% cotton for ultimate comfort and style.',
        seoKeywords: [colorName.toLowerCase(), category.toLowerCase(), 'cotton', 'premium', 'men'],
        sku: category.toUpperCase().replace(/\s+/g, '-') + '-' + colorName.toUpperCase().replace(/\s+/g, '-') + '-' + String(index).padStart(3, '0'),
        soldCount: Math.floor(Math.random() * 150),
        viewCount: Math.floor(Math.random() * 500),
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    };

    // CATEGORY 1: ZIPPER POLOS (10 products)
    console.log('\nCreating Zipper Polos...');
    const zipperColorNames = ['Navy Blue', 'Dark Red', 'Dark Slate', 'Indigo', 'Saddle Brown'];

    products.push(generateProduct(1, 'Zipper Polo', zipperColorNames[0], zipperColors[0], zipperColors, 1499, true, false, true, false));
    products.push(generateProduct(2, 'Zipper Polo', zipperColorNames[1], zipperColors[1], zipperColors, 1499, true, true, false, true));
    products.push(generateProduct(3, 'Zipper Polo', zipperColorNames[2], zipperColors[2], zipperColors, 1499, false, true, true, false));
    products.push(generateProduct(4, 'Zipper Polo', zipperColorNames[3], zipperColors[3], zipperColors, 1499, false, false, false, true));
    products.push(generateProduct(5, 'Zipper Polo', zipperColorNames[4], zipperColors[4], zipperColors, 1499, false, true, false, false));
    products.push(generateProduct(6, 'Zipper Polo', zipperColorNames[0], zipperColors[0], zipperColors, 1599, true, false, false, false));
    products.push(generateProduct(7, 'Zipper Polo', zipperColorNames[1], zipperColors[1], zipperColors, 1599, false, false, true, false));
    products.push(generateProduct(8, 'Zipper Polo', zipperColorNames[2], zipperColors[2], zipperColors, 1399, false, false, false, true));
    products.push(generateProduct(9, 'Zipper Polo', zipperColorNames[3], zipperColors[3], zipperColors, 1399, false, true, false, false));
    products.push(generateProduct(10, 'Zipper Polo', zipperColorNames[4], zipperColors[4], zipperColors, 1499, false, false, false, false));

    // CATEGORY 2: COLLAR POLOS (10 products)
    console.log('Creating Collar Polos...');
    const collarColorNames = ['Black', 'White', 'Grey', 'Charcoal', 'Light Grey'];

    products.push(generateProduct(11, 'Collar Polo', collarColorNames[0], collarColors[0], collarColors, 1299, false, true, true, false));
    products.push(generateProduct(12, 'Collar Polo', collarColorNames[1], collarColors[1], collarColors, 1299, true, true, true, false));
    products.push(generateProduct(13, 'Collar Polo', collarColorNames[2], collarColors[2], collarColors, 1299, true, false, false, true));
    products.push(generateProduct(14, 'Collar Polo', collarColorNames[3], collarColors[3], collarColors, 1299, false, true, false, false));
    products.push(generateProduct(15, 'Collar Polo', collarColorNames[4], collarColors[4], collarColors, 1299, false, false, true, false));
    products.push(generateProduct(16, 'Collar Polo', collarColorNames[0], collarColors[0], collarColors, 1399, true, false, false, false));
    products.push(generateProduct(17, 'Collar Polo', collarColorNames[1], collarColors[1], collarColors, 1399, false, false, false, true));
    products.push(generateProduct(18, 'Collar Polo', collarColorNames[2], collarColors[2], collarColors, 1199, false, true, false, false));
    products.push(generateProduct(19, 'Collar Polo', collarColorNames[3], collarColors[3], collarColors, 1199, false, false, false, true));
    products.push(generateProduct(20, 'Collar Polo', collarColorNames[4], collarColors[4], collarColors, 1299, false, false, false, false));

    // CATEGORY 3: V-NECK T-SHIRTS (10 products)
    console.log('Creating V-Neck T-Shirts...');
    const vneckColorNames = ['Royal Blue', 'Lime Green', 'Tomato Red', 'Gold', 'Medium Purple'];

    products.push(generateProduct(21, 'V-Neck T-Shirt', vneckColorNames[0], vneckColors[0], vneckColors, 899, true, false, true, false));
    products.push(generateProduct(22, 'V-Neck T-Shirt', vneckColorNames[1], vneckColors[1], vneckColors, 899, true, true, false, true));
    products.push(generateProduct(23, 'V-Neck T-Shirt', vneckColorNames[2], vneckColors[2], vneckColors, 899, false, true, true, false));
    products.push(generateProduct(24, 'V-Neck T-Shirt', vneckColorNames[3], vneckColors[3], vneckColors, 899, false, false, false, true));
    products.push(generateProduct(25, 'V-Neck T-Shirt', vneckColorNames[4], vneckColors[4], vneckColors, 899, false, true, false, false));
    products.push(generateProduct(26, 'V-Neck T-Shirt', vneckColorNames[0], vneckColors[0], vneckColors, 999, true, false, false, false));
    products.push(generateProduct(27, 'V-Neck T-Shirt', vneckColorNames[1], vneckColors[1], vneckColors, 999, false, false, true, false));
    products.push(generateProduct(28, 'V-Neck T-Shirt', vneckColorNames[2], vneckColors[2], vneckColors, 799, false, false, false, true));
    products.push(generateProduct(29, 'V-Neck T-Shirt', vneckColorNames[3], vneckColors[3], vneckColors, 799, false, true, false, false));
    products.push(generateProduct(30, 'V-Neck T-Shirt', vneckColorNames[4], vneckColors[4], vneckColors, 899, false, false, false, false));

    // CATEGORY 4: ROUND NECK T-SHIRTS (10 products)
    console.log('Creating Round Neck T-Shirts...');
    const roundNeckColorNames = ['Orange Red', 'Dark Turquoise', 'Deep Pink', 'Chartreuse', 'Dark Orange'];

    products.push(generateProduct(31, 'Round Neck T-Shirt', roundNeckColorNames[0], roundNeckColors[0], roundNeckColors, 799, true, false, true, false));
    products.push(generateProduct(32, 'Round Neck T-Shirt', roundNeckColorNames[1], roundNeckColors[1], roundNeckColors, 799, true, true, false, true));
    products.push(generateProduct(33, 'Round Neck T-Shirt', roundNeckColorNames[2], roundNeckColors[2], roundNeckColors, 799, false, true, true, false));
    products.push(generateProduct(34, 'Round Neck T-Shirt', roundNeckColorNames[3], roundNeckColors[3], roundNeckColors, 799, false, false, false, true));
    products.push(generateProduct(35, 'Round Neck T-Shirt', roundNeckColorNames[4], roundNeckColors[4], roundNeckColors, 799, false, true, false, false));
    products.push(generateProduct(36, 'Round Neck T-Shirt', roundNeckColorNames[0], roundNeckColors[0], roundNeckColors, 899, true, false, false, false));
    products.push(generateProduct(37, 'Round Neck T-Shirt', roundNeckColorNames[1], roundNeckColors[1], roundNeckColors, 899, false, false, true, false));
    products.push(generateProduct(38, 'Round Neck T-Shirt', roundNeckColorNames[2], roundNeckColors[2], roundNeckColors, 699, false, false, false, true));
    products.push(generateProduct(39, 'Round Neck T-Shirt', roundNeckColorNames[3], roundNeckColors[3], roundNeckColors, 699, false, true, false, false));
    products.push(generateProduct(40, 'Round Neck T-Shirt', roundNeckColorNames[4], roundNeckColors[4], roundNeckColors, 799, false, false, false, false));

    // CATEGORY 5: HENLEY SHIRTS (10 products)
    console.log('Creating Henley Shirts...');
    const henleyColorNames = ['Dark Olive', 'Saddle Brown', 'Dark Slate', 'Dim Grey', 'Sienna'];

    products.push(generateProduct(41, 'Henley Shirt', henleyColorNames[0], henleyColors[0], henleyColors, 1199, true, false, true, false));
    products.push(generateProduct(42, 'Henley Shirt', henleyColorNames[1], henleyColors[1], henleyColors, 1199, true, true, false, true));
    products.push(generateProduct(43, 'Henley Shirt', henleyColorNames[2], henleyColors[2], henleyColors, 1199, false, true, true, false));
    products.push(generateProduct(44, 'Henley Shirt', henleyColorNames[3], henleyColors[3], henleyColors, 1199, false, false, false, true));
    products.push(generateProduct(45, 'Henley Shirt', henleyColorNames[4], henleyColors[4], henleyColors, 1199, false, true, false, false));
    products.push(generateProduct(46, 'Henley Shirt', henleyColorNames[0], henleyColors[0], henleyColors, 1299, true, false, false, false));
    products.push(generateProduct(47, 'Henley Shirt', henleyColorNames[1], henleyColors[1], henleyColors, 1299, false, false, true, false));
    products.push(generateProduct(48, 'Henley Shirt', henleyColorNames[2], henleyColors[2], henleyColors, 1099, false, false, false, true));
    products.push(generateProduct(49, 'Henley Shirt', henleyColorNames[3], henleyColors[3], henleyColors, 1099, false, true, false, false));
    products.push(generateProduct(50, 'Henley Shirt', henleyColorNames[4], henleyColors[4], henleyColors, 1199, false, false, false, false));

    // Create all products
    console.log('\nSaving products to database...');
    for (const productData of products) {
      await productRepo.create(productData as any);
      console.log('Created: ' + productData.name + ' (' + productData.sku + ')');
    }

    console.log('\n=== 50-Product seeding completed successfully! ===');
    console.log('\nProduct Summary:');
    console.log('========================================');
    console.log('Total Products: ' + products.length);
    console.log('\nBy Category:');
    console.log('  - Zipper Polos: 10');
    console.log('  - Collar Polos: 10');
    console.log('  - V-Neck T-Shirts: 10');
    console.log('  - Round Neck T-Shirts: 10');
    console.log('  - Henley Shirts: 10');
    console.log('\nBy Status:');
    console.log('  - Published: ' + products.filter(p => p.status === 'published').length);
    console.log('  - New Arrivals: ' + products.filter(p => p.isNewArrival).length);
    console.log('  - Best Sellers: ' + products.filter(p => p.isBestSeller).length);
    console.log('  - Featured: ' + products.filter(p => p.isFeatured).length);
    console.log('  - On Sale: ' + products.filter(p => p.salePrice).length);
    console.log('\nPrice Range:');
    console.log('  - Min: Rs.' + Math.min(...products.map(p => p.price)));
    console.log('  - Max: Rs.' + Math.max(...products.map(p => p.price)));
    console.log('========================================\n');
  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
}

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
    await seed50Products(app);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed products:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
