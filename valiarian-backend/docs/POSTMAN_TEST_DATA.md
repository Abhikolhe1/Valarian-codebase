# Postman Data - Exact Match to Frontend UI

**Base URL**: `http://localhost:3035`
**Source**: Extracted from actual frontend code in `valiarian-frontend/src/sections/home/`

---

## 🎯 Home Page Sections (In Order)

The home page has these sections in this exact order:
1. Hero Section
2. Scroll Animated Section (animation only)
3. New Arrivals Section
4. Collection Hero Section
5. Best Sellers Section
6. Fabric Section
7. Social Media Section

---

## 📁 Step 1: Upload All Required Images First

Upload these images via `POST /api/cms/media/upload` and save the URLs:

### Hero Section Images:
```
File: valiarian-hero.png
Location: /assets/images/home/hero/valiarian-hero.png
altText: Premium Cotton Polos Hero Image
folder: home-hero
tags: hero,main,premium
```

### New Arrivals Images:
```
File: t-shirt1.jpeg
Location: /assets/images/home/new-arrival/t-shirt1.jpeg
altText: Premium Cotton T-Shirt
folder: new-arrivals
tags: product,tshirt,new
```

```
File: new-arrival-hero.jpeg
Location: /assets/images/home/new-arrival/new-arrival-hero.jpeg
altText: New Arrival Collection Hero
folder: new-arrivals
tags: hero,collection,new
```

### Fabric Section Images:
```
File: fabric1.webp
Location: /assets/images/home/fabric/fabric1.webp
altText: Premium Egyptian Cotton Fabric
folder: fabrics
tags: fabric,cotton,premium
```

```
File: fabric2.jpg
Location: /assets/images/home/fabric/fabric2.jpg
altText: Organic Bamboo Fiber Fabric
folder: fabrics
tags: fabric,bamboo,organic
```

### Fabric Section Videos:
```
File: fabric1.mp4
Location: /assets/images/home/fabric/fabric1.mp4
altText: Premium Egyptian Cotton Video
folder: fabrics
tags: fabric,video,cotton
```

```
File: fabric2.mp4
Location: /assets/images/home/fabric/fabric2.mp4
altText: Organic Bamboo Fiber Video
folder: fabrics
tags: fabric,video,bamboo
```

### Social Media Images:
```
Files: social-1.jpeg, social-2.jpeg, social-3.jpeg, social-4.jpeg, social-5.jpeg
Location: /assets/images/home/social-media/
altText: Instagram/YouTube Social Media Post
folder: social-media
tags: social,instagram,youtube
```

---

## 📄 Step 2: Create Home Page

**Endpoint**: `POST /api/cms/pages` ✅ NOW AVAILABLE

```json
{
  "title": "Home - Valiarian Premium Cotton Polos",
  "slug": "home",
  "description": "Premium Cotton Polos | Engineered for Comfort",
  "status": "draft",
  "scheduledAt": null,
  "seoTitle": "Valiarian - Premium Cotton Polos | Engineered for Comfort",
  "seoDescription": "Discover premium cotton polos engineered for comfort. Shop our collection of high-quality, sustainable fashion.",
  "seoKeywords": ["premium cotton polos", "engineered comfort", "sustainable fashion", "valiarian"],
  "ogImage": "[PASTE_HERO_IMAGE_URL_HERE]",
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Valiarian Home",
    "description": "Premium Cotton Polos | Engineered for Comfort"
  }
}
```

**Note**: Replace `[PASTE_HERO_IMAGE_URL_HERE]` with the URL from hero image upload

**Response**: You'll get a page object with an `id` field - save this ID for creating sections!

---

## 🎨 Step 3: Create Sections (Use Page ID from Step 2)

### Section 1: Hero Section

**Endpoint**: `POST /api/cms/sections`

```json
{
  "pageId": 1,
  "type": "hero",
  "name": "Home Hero",
  "order": 1,
  "enabled": true,
  "content": {
    "backgroundImage": "[PASTE_valiarian-hero.png_URL_HERE]",
    "backgroundVideo": null,
    "heading": "Premium Cotton Polos.",
    "subheading": null,
    "ctaButtons": [
      {
        "text": "Explore Collection",
        "url": "/products",
        "variant": "outlined",
        "color": "white"
      }
    ],
    "overlay": true,
    "overlayOpacity": 0.2,
    "textAlign": "left",
    "height": "100vh",
    "contentPosition": "bottom-left"
  }
}
```

**Note**: Replace `[PASTE_valiarian-hero.png_URL_HERE]` with actual uploaded URL

---

### Section 2: New Arrivals

**Endpoint**: `POST /api/cms/sections`

```json
{
  "pageId": 1,
  "type": "custom",
  "name": "New Arrivals",
  "order": 2,
  "enabled": true,
  "content": {
    "title": "New Arrivals",
    "subtitle": "Discover our latest collection of premium cotton polos, crafted with the same attention to detail and commitment to quality.",
    "layout": "carousel",
    "slidesToShow": 4,
    "autoplay": false,
    "infinite": true,
    "products": [
      {
        "id": "new-arrival-1",
        "name": "Premium Cotton Classic T-Shirt",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 1299,
        "salePrice": null,
        "colors": ["#000000", "#FFFFFF", "#1890FF"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": ["New"]
      },
      {
        "id": "new-arrival-2",
        "name": "Essential Comfort Fit T-Shirt",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 1499,
        "salePrice": 1199,
        "colors": ["#FF4842", "#00AB55", "#FFC107"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "badges": ["New", "Sale"]
      },
      {
        "id": "new-arrival-3",
        "name": "Modern Fit Premium T-Shirt",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 1599,
        "salePrice": null,
        "colors": ["#000000", "#FFFFFF", "#94D82D"],
        "sizes": ["M", "L", "XL"],
        "badges": ["New"]
      },
      {
        "id": "new-arrival-4",
        "name": "Classic Crew Neck T-Shirt",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 1399,
        "salePrice": 1099,
        "colors": ["#1890FF", "#FFC0CB", "#000000"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": ["New", "Sale"]
      }
    ]
  }
}
```

---

### Section 3: Collection Hero

**Endpoint**: `POST /api/cms/sections`

```json
{
  "pageId": 1,
  "type": "gallery",
  "name": "Collection Hero",
  "order": 3,
  "enabled": true,
  "content": {
    "image": "[PASTE_new-arrival-hero.jpeg_URL_HERE]",
    "altText": "New Arrival Collection",
    "height": "60vh",
    "overlay": false
  }
}
```

---

### Section 4: Best Sellers

**Endpoint**: `POST /api/cms/sections`

```json
{
  "pageId": 1,
  "type": "custom",
  "name": "Best Sellers",
  "order": 4,
  "enabled": true,
  "content": {
    "title": "Best Sellers",
    "subtitle": "Our most beloved pieces, chosen by customers for their exceptional quality and timeless appeal.",
    "layout": "grid",
    "columns": 4,
    "mobileColumns": 2,
    "products": [
      {
        "id": "best-seller-1",
        "name": "Nike Air Force 1 NDESTRUKT",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 5200.84,
        "salePrice": 3500.71,
        "colors": ["#8E33FF", "#FFD700", "#1890FF"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": ["Sale"]
      },
      {
        "id": "best-seller-2",
        "name": "Foundations Matte Flip Flop",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 2800.22,
        "salePrice": null,
        "colors": ["#000000", "#FFFFFF", "#FF4842"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": []
      },
      {
        "id": "best-seller-3",
        "name": "Arizona Soft Footbed Sandal",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 3200.5,
        "salePrice": null,
        "colors": ["#00AB55", "#FFC107", "#1890FF"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": []
      },
      {
        "id": "best-seller-4",
        "name": "Gazelle Vintage low-top sneakers",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 4500.0,
        "salePrice": null,
        "colors": ["#000000", "#FFFFFF", "#8B4513"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": []
      },
      {
        "id": "best-seller-5",
        "name": "Boston Soft Footbed Sandal",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 3800.75,
        "salePrice": null,
        "colors": ["#FF6B6B", "#4ECDC4", "#000000"],
        "sizes": ["M", "L", "XL", "XXL"],
        "badges": []
      },
      {
        "id": "best-seller-6",
        "name": "Jordan Delta",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 4300.83,
        "salePrice": 2800.22,
        "colors": ["#000000", "#FFFFFF", "#FFD700"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": ["Sale"]
      },
      {
        "id": "best-seller-7",
        "name": "Nike Air Zoom Pegasus 37 A.I.R.",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 5500.0,
        "salePrice": null,
        "colors": ["#8B0000", "#000000", "#FFFFFF"],
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "badges": []
      },
      {
        "id": "best-seller-8",
        "name": "Boston Soft Footbed Sandal",
        "image": "[PASTE_t-shirt1.jpeg_URL_HERE]",
        "price": 3600.5,
        "salePrice": null,
        "colors": ["#FFFFFF", "#000000", "#9370DB"],
        "sizes": ["S", "M", "L", "XL"],
        "badges": []
      }
    ]
  }
}
```

---

### Section 5: Premium Fabrics

**Endpoint**: `POST /api/cms/sections`

```json
{
  "pageId": 1,
  "type": "features",
  "name": "Premium Fabrics",
  "order": 5,
  "enabled": true,
  "content": {
    "title": "Premium Fabrics",
    "subtitle": "Discover the exceptional materials that make our clothing extraordinary",
    "fabrics": [
      {
        "id": 1,
        "name": "Premium Egyptian Cotton",
        "description": "Sourced from the finest Egyptian cotton fields, this luxurious fabric offers unmatched softness and breathability. Perfect for everyday comfort.",
        "image": "[PASTE_fabric1.webp_URL_HERE]",
        "video": "[PASTE_fabric1.mp4_URL_HERE]",
        "tags": ["100% Cotton", "Breathable", "Durable"]
      },
      {
        "id": 2,
        "name": "Organic Bamboo Fiber",
        "description": "Eco-friendly and naturally antimicrobial, bamboo fiber provides exceptional moisture-wicking properties and a silky smooth texture.",
        "image": "[PASTE_fabric2.jpg_URL_HERE]",
        "video": "[PASTE_fabric2.mp4_URL_HERE]",
        "tags": ["Sustainable", "Antimicrobial", "Moisture-Wicking"]
      },
      {
        "id": 3,
        "name": "Supima Cotton Blend",
        "description": "Premium Supima cotton blended with spandex for enhanced stretch and shape retention. Ideal for a modern, fitted silhouette.",
        "image": "[PASTE_fabric1.webp_URL_HERE]",
        "video": "[PASTE_fabric1.mp4_URL_HERE]",
        "tags": ["Elastic", "Shape Retention", "Premium"]
      },
      {
        "id": 4,
        "name": "Linen-Cotton Mix",
        "description": "The perfect blend of natural linen and cotton creates a fabric that is both sophisticated and comfortable, with excellent temperature regulation.",
        "image": "[PASTE_fabric2.jpg_URL_HERE]",
        "video": "[PASTE_fabric2.mp4_URL_HERE]",
        "tags": ["Temperature Regulating", "Elegant", "Natural"]
      }
    ]
  }
}
```

---

### Section 6: Social Media

**Endpoint**: `POST /api/cms/sections`

```json
{
  "pageId": 1,
  "type": "gallery",
  "name": "Social Media",
  "order": 6,
  "enabled": true,
  "content": {
    "title": "@valiarianpremiumpolos",
    "titleColor": "#d32f2f",
    "layout": "masonry",
    "images": [
      {
        "id": 1,
        "url": "[PASTE_social-1.jpeg_URL_HERE]",
        "alt": "Instagram Main",
        "link": "https://www.instagram.com/valiarian.wear",
        "size": "large",
        "platform": "instagram"
      },
      {
        "id": 2,
        "url": "[PASTE_social-2.jpeg_URL_HERE]",
        "alt": "YouTube Post 1",
        "link": "https://youtube.com/@valiarianwear",
        "size": "small",
        "platform": "youtube"
      },
      {
        "id": 3,
        "url": "[PASTE_social-3.jpeg_URL_HERE]",
        "alt": "YouTube Post 2",
        "link": "https://youtube.com/@valiarianwear",
        "size": "small",
        "platform": "youtube"
      },
      {
        "id": 4,
        "url": "[PASTE_social-4.jpeg_URL_HERE]",
        "alt": "YouTube Post 3",
        "link": "https://youtube.com/@valiarianwear",
        "size": "small",
        "platform": "youtube"
      },
      {
        "id": 5,
        "url": "[PASTE_social-5.jpeg_URL_HERE]",
        "alt": "YouTube Post 4",
        "link": "https://youtube.com/@valiarianwear",
        "size": "small",
        "platform": "youtube"
      }
    ]
  }
}
```

---

## 🔄 Step 4: Publish the Page

**Endpoint**: `POST /api/cms/pages/1/publish`

```json
{
  "comment": "Initial home page launch with all sections"
}
```

---

## 📝 Important Notes

1. **All placeholders** like `[PASTE_valiarian-hero.png_URL_HERE]` must be replaced with actual URLs from media upload responses

2. **Upload sequence**:
   - Upload all images/videos first
   - Copy URLs from responses
   - Paste URLs into section data
   - Create sections

3. **Exact text from UI** - All headings, descriptions, and button text are copied exactly from the frontend code

4. **Product data** - Product names, prices, and details are from the actual dummy data in the frontend

5. **Social media links** - Real links from the frontend code

---

## ✅ Checklist

- [ ] Upload hero image (valiarian-hero.png)
- [ ] Upload product images (t-shirt1.jpeg, new-arrival-hero.jpeg)
- [ ] Upload fabric images (fabric1.webp, fabric2.jpg)
- [ ] Upload fabric videos (fabric1.mp4, fabric2.mp4)
- [ ] Upload social media images (social-1 to social-5.jpeg)
- [ ] Create home page
- [ ] Create Section 1: Hero
- [ ] Create Section 2: New Arrivals
- [ ] Create Section 3: Collection Hero
- [ ] Create Section 4: Best Sellers
- [ ] Create Section 5: Premium Fabrics
- [ ] Create Section 6: Social Media
- [ ] Publish page

---

**Source**: Extracted from `valiarian-frontend/src/sections/home/`
**Date**: February 16, 2026
**Status**: Ready for implementation
