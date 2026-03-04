import {v4 as uuidv4} from 'uuid';
import {ValiarianBackendApplication} from '../application';
import {ProductVariant} from '../models';
import {ProductRepository} from '../repositories';

export async function seed50ProductsWithVariants(app: ValiarianBackendApplication) {
  const productRepo = await app.getRepository(ProductRepository);

  console.log('Starting 50-product seeding with variants...');

  try {
    const now = new Date();
    const products = [];

    // Color definitions with names
    const colorDefinitions = {
      zipper: [
        {hex: '#000080', name: 'Navy Blue'},
        {hex: '#8B0000', name: 'Dark Red'},
        {hex: '#2F4F4F', name: 'Dark Slate'},
        {hex: '#4B0082', name: 'Indigo'},
        {hex: '#8B4513', name: 'Saddle Brown'},
      ],
      collar: [
        {hex: '#000000', name: 'Black'},
        {hex: '#FFFFFF', name: 'White'},
        {hex: '#808080', name: 'Grey'},
        {hex: '#1C1C1C', name: 'Charcoal'},
        {hex: '#D3D3D3', name: 'Light Grey'},
      ],
      vneck: [
        {hex: '#4169E1', name: 'Royal Blue'},
        {hex: '#32CD32', name: 'Lime Green'},
        {hex: '#FF6347', name: 'Tomato Red'},
        {hex: '#FFD700', name: 'Gold'},
        {hex: '#9370DB', name: 'Medium Purple'},
      ],
      roundNeck: [
        {hex: '#FF4500', name: 'Orange Red'},
        {hex: '#00CED1', name: 'Dark Turquoise'},
        {hex: '#FF1493', name: 'Deep Pink'},
        {hex: '#7FFF00', name: 'Chartreuse'},
        {hex: '#FF8C00', name: 'Dark Orange'},
      ],
      henley: [
        {hex: '#556B2F', name: 'Dark Olive'},
        {hex: '#8B4513', name: 'Saddle Brown'},
        {hex: '#2F4F4F', name: 'Dark Slate'},
        {hex: '#696969', name: 'Dim Grey'},
        {hex: '#A0522D', name: 'Sienna'},
      ],
    };

    const sizes = ['S', 'M', 'L', 'XL', 'XXL'];

    // Helper function to generate variants for a product
    const generateVariants = (
      productSku: string,
      colors: Array<{hex: string; name: string}>,
      basePrice: number,
      category: string
    ): ProductVariant[] => {
      const variants: ProductVariant[] = [];
      let isFirst = true;

      colors.forEach(color => {
        sizes.forEach(size => {
          const stockQuantity = Math.floor(Math.random() * 20) + 5;
          variants.push({
            id: uuidv4(),
            sku: productSku + '-' + color.hex.replace('#', '') + '-' + size,
            color: color.hex,
            colorName: color.name,
            size,
            images: [
              '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + color.name.toLowerCase().replace(/\s+/g, '-') + '-front.jpg',
              '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + color.name.toLowerCase().replace(/\s+/g, '-') + '-back.jpg',
              '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + color.name.toLowerCase().replace(/\s+/g, '-') + '-side.jpg',
            ],
            price: undefined,
            stockQuantity,
            inStock: stockQuantity > 0,
            isDefault: isFirst,
          });
          isFirst = false;
        });
      });

      return variants;
    };

    // Helper function to generate product with variants
    const generateProduct = (
      index: number,
      category: string,
      colorDefs: Array<{hex: string; name: string}>,
      basePrice: number,
      isNewArrival: boolean = false,
      isBestSeller: boolean = false,
      isFeatured: boolean = false,
      onSale: boolean = false
    ) => {
      const mainColor = colorDefs[0];
      const slug = category.toLowerCase().replace(/\s+/g, '-') + '-' + index;
      const salePrice = onSale ? Math.round(basePrice * 0.75) : undefined;
      const sku = category.toUpperCase().replace(/\s+/g, '-') + '-' + String(index).padStart(3, '0');

      // Generate variants for all color+size combinations
      const variants = generateVariants(sku, colorDefs, basePrice, category);

      // Calculate total stock from variants
      const totalStock = variants.reduce((sum, v) => sum + v.stockQuantity, 0);

      // Get all unique colors for legacy colors field
      const colors = colorDefs.map(c => c.hex);

      return {
        id: uuidv4(),
        name: category + ' - Style ' + index,
        slug,
        description: 'Premium ' + category.toLowerCase() + ' crafted from 100% high-quality cotton. Features modern fit, reinforced stitching, and superior comfort. Perfect for both casual and semi-formal occasions. Available in multiple colors and sizes. Designed for durability and style.',
        shortDescription: 'Premium ' + category.toLowerCase() + ' with modern fit - Available in ' + colorDefs.length + ' colors',
        price: basePrice,
        salePrice,
        saleStartDate: onSale ? now : undefined,
        saleEndDate: onSale ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
        currency: 'INR',
        coverImage: '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + mainColor.name.toLowerCase().replace(/\s+/g, '-') + '-front.jpg',
        images: [
          '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + mainColor.name.toLowerCase().replace(/\s+/g, '-') + '-front.jpg',
          '/assets/images/products/' + category.toLowerCase().replace(/\s+/g, '-') + '-' + mainColor.name.toLowerCase().replace(/\s+/g, '-') + '-back.jpg',
        ],
        colors,
        sizes,
        variants,
        stockQuantity: totalStock,
        trackInventory: true,
        lowStockThreshold: 10,
        inStock: totalStock > 0,
        isNewArrival,
        isBestSeller,
        isFeatured,
        newArrivalStartDate: isNewArrival ? now : undefined,
        newArrivalEndDate: isNewArrival ? new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) : undefined,
        categories: [category, 'Men'],
        tags: [category.toLowerCase().split(' ')[0], 'cotton', 'premium', 'multi-color'],
        status: 'published' as 'published' | 'draft' | 'archived',
        seoTitle: category + ' - Premium Cotton | Valiarian',
        seoDescription: 'Shop our premium ' + category.toLowerCase() + '. Made from 100% cotton for ultimate comfort and style. Available in ' + colorDefs.length + ' colors and all sizes.',
        seoKeywords: [category.toLowerCase(), 'cotton', 'premium', 'men', 'multi-color'],
        sku,
        soldCount: Math.floor(Math.random() * 150),
        viewCount: Math.floor(Math.random() * 500),
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      };
    };

    // CATEGORY 1: ZIPPER POLOS (10 products)
    console.log('\nCreating Zipper Polos with variants...');
    products.push(generateProduct(1, 'Zipper Polo', colorDefinitions.zipper, 1499, true, false, true, false));
    products.push(generateProduct(2, 'Zipper Polo', colorDefinitions.zipper, 1499, true, true, false, true));
    products.push(generateProduct(3, 'Zipper Polo', colorDefinitions.zipper, 1499, false, true, true, false));
    products.push(generateProduct(4, 'Zipper Polo', colorDefinitions.zipper, 1499, false, false, false, true));
    products.push(generateProduct(5, 'Zipper Polo', colorDefinitions.zipper, 1499, false, true, false, false));
    products.push(generateProduct(6, 'Zipper Polo', colorDefinitions.zipper, 1599, true, false, false, false));
    products.push(generateProduct(7, 'Zipper Polo', colorDefinitions.zipper, 1599, false, false, true, false));
    products.push(generateProduct(8, 'Zipper Polo', colorDefinitions.zipper, 1399, false, false, false, true));
    products.push(generateProduct(9, 'Zipper Polo', colorDefinitions.zipper, 1399, false, true, false, false));
    products.push(generateProduct(10, 'Zipper Polo', colorDefinitions.zipper, 1499, false, false, false, false));

    // CATEGORY 2: COLLAR POLOS (10 products)
    console.log('Creating Collar Polos with variants...');
    products.push(generateProduct(11, 'Collar Polo', colorDefinitions.collar, 1299, false, true, true, false));
    products.push(generateProduct(12, 'Collar Polo', colorDefinitions.collar, 1299, true, true, true, false));
    products.push(generateProduct(13, 'Collar Polo', colorDefinitions.collar, 1299, true, false, false, true));
    products.push(generateProduct(14, 'Collar Polo', colorDefinitions.collar, 1299, false, true, false, false));
    products.push(generateProduct(15, 'Collar Polo', colorDefinitions.collar, 1399, false, false, true, false));
    products.push(generateProduct(16, 'Collar Polo', colorDefinitions.collar, 1399, true, false, false, true));
    products.push(generateProduct(17, 'Collar Polo', colorDefinitions.collar, 1199, false, true, false, false));
    products.push(generateProduct(18, 'Collar Polo', colorDefinitions.collar, 1199, false, false, false, true));
    products.push(generateProduct(19, 'Collar Polo', colorDefinitions.collar, 1299, false, false, true, false));
    products.push(generateProduct(20, 'Collar Polo', colorDefinitions.collar, 1299, false, false, false, false));

    // CATEGORY 3: V-NECK T-SHIRTS (10 products)
    console.log('Creating V-Neck T-Shirts with variants...');
    products.push(generateProduct(21, 'V-Neck T-Shirt', colorDefinitions.vneck, 899, true, false, false, false));
    products.push(generateProduct(22, 'V-Neck T-Shirt', colorDefinitions.vneck, 899, true, true, true, false));
    products.push(generateProduct(23, 'V-Neck T-Shirt', colorDefinitions.vneck, 899, false, true, false, true));
    products.push(generateProduct(24, 'V-Neck T-Shirt', colorDefinitions.vneck, 899, false, false, true, false));
    products.push(generateProduct(25, 'V-Neck T-Shirt', colorDefinitions.vneck, 999, false, true, false, false));
    products.push(generateProduct(26, 'V-Neck T-Shirt', colorDefinitions.vneck, 999, true, false, false, true));
    products.push(generateProduct(27, 'V-Neck T-Shirt', colorDefinitions.vneck, 799, false, false, false, false));
    products.push(generateProduct(28, 'V-Neck T-Shirt', colorDefinitions.vneck, 799, false, true, true, false));
    products.push(generateProduct(29, 'V-Neck T-Shirt', colorDefinitions.vneck, 899, false, false, false, true));
    products.push(generateProduct(30, 'V-Neck T-Shirt', colorDefinitions.vneck, 899, false, false, false, false));

    // CATEGORY 4: ROUND NECK T-SHIRTS (10 products)
    console.log('Creating Round Neck T-Shirts with variants...');
    products.push(generateProduct(31, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 799, false, true, true, false));
    products.push(generateProduct(32, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 799, true, true, false, true));
    products.push(generateProduct(33, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 799, true, false, true, false));
    products.push(generateProduct(34, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 799, false, true, false, false));
    products.push(generateProduct(35, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 899, false, false, false, true));
    products.push(generateProduct(36, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 899, true, false, false, false));
    products.push(generateProduct(37, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 699, false, true, true, false));
    products.push(generateProduct(38, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 699, false, false, false, true));
    products.push(generateProduct(39, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 799, false, false, false, false));
    products.push(generateProduct(40, 'Round Neck T-Shirt', colorDefinitions.roundNeck, 799, false, false, true, false));

    // CATEGORY 5: HENLEY SHIRTS (10 products)
    console.log('Creating Henley Shirts with variants...');
    products.push(generateProduct(41, 'Henley Shirt', colorDefinitions.henley, 1099, true, false, true, false));
    products.push(generateProduct(42, 'Henley Shirt', colorDefinitions.henley, 1099, true, true, false, true));
    products.push(generateProduct(43, 'Henley Shirt', colorDefinitions.henley, 1099, false, true, true, false));
    products.push(generateProduct(44, 'Henley Shirt', colorDefinitions.henley, 1099, false, false, false, false));
    products.push(generateProduct(45, 'Henley Shirt', colorDefinitions.henley, 1199, false, true, false, true));
    products.push(generateProduct(46, 'Henley Shirt', colorDefinitions.henley, 1199, true, false, false, false));
    products.push(generateProduct(47, 'Henley Shirt', colorDefinitions.henley, 999, false, false, true, false));
    products.push(generateProduct(48, 'Henley Shirt', colorDefinitions.henley, 999, false, true, false, false));
    products.push(generateProduct(49, 'Henley Shirt', colorDefinitions.henley, 1099, false, false, false, true));
    products.push(generateProduct(50, 'Henley Shirt', colorDefinitions.henley, 1099, false, false, false, false));

    // Insert all products
    console.log('\nInserting ' + products.length + ' products into database...');
    for (const product of products) {
      await productRepo.create(product);
      console.log('Created: ' + product.name + ' with ' + product.variants.length + ' variants');
    }

    console.log('\nSeeding completed successfully!');
    console.log('Total products created: ' + products.length);
    console.log('Total variants created: ' + products.reduce((sum, p) => sum + p.variants.length, 0));

  } catch (error) {
    console.error('Error seeding products:', error);
    throw error;
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  const app = new ValiarianBackendApplication();
  app.boot()
    .then(() => seed50ProductsWithVariants(app))
    .then(() => {
      console.log('Seed script completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seed script failed:', err);
      process.exit(1);
    });
}
