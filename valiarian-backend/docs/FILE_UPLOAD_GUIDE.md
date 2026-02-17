# File Upload Guide for CMS Media API

## 📁 Media Upload Endpoint

**URL**: `POST http://localhost:3035/api/cms/media/upload`

**Content-Type**: `multipart/form-data`

**Authentication**: Required (JWT Bearer Token)

---

## 🎯 Postman Setup

### Step 1: Create New Request
1. Method: `POST`
2. URL: `http://localhost:3035/api/cms/media/upload`

### Step 2: Add Authorization
1. Go to "Authorization" tab
2. Type: `Bearer Token`
3. Token: `YOUR_JWT_TOKEN`

### Step 3: Configure Body
1. Go to "Body" tab
2. Select: `form-data`
3. Add the following fields:

| Key | Type | Value | Description |
|-----|------|-------|-------------|
| `file` | **File** | [Select File] | **REQUIRED** - Click "Select Files" button |
| `altText` | Text | "Hero background image" | Alternative text for accessibility |
| `caption` | Text | "Main hero section background" | Image caption |
| `folder` | Text | "home-page" | Folder to organize media |
| `tags` | Text | "hero,background,home" | Comma-separated tags |

### Step 4: Send Request

---

## 📸 Supported File Types

### Images:
- ✅ JPEG/JPG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ WebP (`.webp`)
- ✅ SVG (`.svg`)

### Videos:
- ✅ MP4 (`.mp4`)
- ✅ WebM (`.webm`)

### File Size Limit:
- Maximum: **10 MB**

---

## 📤 Example Upload Requests

### Upload Hero Background Image

**Form Data**:
```
file: hero-background.jpg (SELECT FROM COMPUTER)
altText: Beautiful modern hero background with gradient
caption: Home page hero section background
folder: home-page
tags: hero,background,gradient,home
```

### Upload Product Image

**Form Data**:
```
file: product-shirt-blue.jpg (SELECT FROM COMPUTER)
altText: Blue cotton shirt front view
caption: Premium cotton shirt in navy blue
folder: products
tags: product,shirt,blue,clothing
```

### Upload Avatar Image

**Form Data**:
```
file: customer-avatar.jpg (SELECT FROM COMPUTER)
altText: Customer profile photo
caption: Emily Rodriguez testimonial photo
folder: testimonials
tags: avatar,testimonial,customer
```

### Upload Logo (SVG)

**Form Data**:
```
file: valiarian-logo.svg (SELECT FROM COMPUTER)
altText: Valiarian brand logo
caption: Main brand logo
folder: branding
tags: logo,brand,svg
```

---

## ✅ Successful Response

```json
{
  "id": 1,
  "filename": "hero-background-1708084800000.webp",
  "originalName": "hero-background.jpg",
  "mimeType": "image/webp",
  "size": 245678,
  "url": "http://localhost:3035/media/images/2026/02/hero-background-1708084800000.webp",
  "thumbnailUrl": "http://localhost:3035/media/images/2026/02/hero-background-1708084800000-thumb.webp",
  "mediumUrl": "http://localhost:3035/media/images/2026/02/hero-background-1708084800000-medium.webp",
  "largeUrl": "http://localhost:3035/media/images/2026/02/hero-background-1708084800000-large.webp",
  "altText": "Beautiful modern hero background with gradient",
  "caption": "Home page hero section background",
  "folder": "home-page",
  "tags": ["hero", "background", "gradient", "home"],
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "createdAt": "2026-02-16T10:30:00.000Z",
  "updatedAt": "2026-02-16T10:30:00.000Z"
}
```

### Important URLs to Copy:
- **Full Size**: `url` - Use for hero backgrounds, large displays
- **Large**: `largeUrl` - Use for product images, galleries
- **Medium**: `mediumUrl` - Use for thumbnails, cards
- **Thumbnail**: `thumbnailUrl` - Use for small previews, avatars

---

## 🔄 Using Uploaded Images

### In Hero Section:
```json
{
  "pageId": 1,
  "type": "hero",
  "content": {
    "backgroundImage": "http://localhost:3035/media/images/2026/02/hero-background-1708084800000.webp"
  }
}
```

### In Gallery Section:
```json
{
  "pageId": 1,
  "type": "gallery",
  "content": {
    "images": [
      {
        "url": "http://localhost:3035/media/images/2026/02/collection-1-1708084900000.webp",
        "alt": "Summer Collection 2026"
      }
    ]
  }
}
```

### In Testimonials:
```json
{
  "testimonials": [
    {
      "name": "Emily Rodriguez",
      "avatar": "http://localhost:3035/media/images/2026/02/avatar-emily-1708085000000.webp"
    }
  ]
}
```

### In Settings:
```json
{
  "logo": "http://localhost:3035/media/images/2026/02/valiarian-logo-1708085100000.svg",
  "favicon": "http://localhost:3035/media/images/2026/02/favicon-1708085200000.ico"
}
```

---

## ❌ Common Errors

### 1. File Too Large
```json
{
  "error": {
    "statusCode": 400,
    "message": "File size exceeds maximum limit of 10MB"
  }
}
```
**Solution**: Compress or resize the image before uploading

### 2. Invalid File Type
```json
{
  "error": {
    "statusCode": 400,
    "message": "Invalid file type. Allowed: jpg, jpeg, png, webp, svg, mp4, webm"
  }
}
```
**Solution**: Convert file to supported format

### 3. Missing File
```json
{
  "error": {
    "statusCode": 400,
    "message": "No file uploaded"
  }
}
```
**Solution**: Ensure you selected a file in the `file` field

### 4. Unauthorized
```json
{
  "error": {
    "statusCode": 401,
    "message": "Authorization header not found"
  }
}
```
**Solution**: Add JWT token in Authorization header

---

## 📊 File Storage Structure

Files are automatically organized:
```
uploads/
└── media/
    ├── images/
    │   └── 2026/
    │       └── 02/
    │           ├── hero-background-1708084800000.webp
    │           ├── hero-background-1708084800000-thumb.webp
    │           ├── hero-background-1708084800000-medium.webp
    │           └── hero-background-1708084800000-large.webp
    └── videos/
        └── 2026/
            └── 02/
                └── promo-video-1708084800000.mp4
```

**Access URLs**:
- Original: `http://localhost:3035/media/images/2026/02/filename.webp`
- Thumbnail: `http://localhost:3035/media/images/2026/02/filename-thumb.webp`
- Medium: `http://localhost:3035/media/images/2026/02/filename-medium.webp`
- Large: `http://localhost:3035/media/images/2026/02/filename-large.webp`

---

## 🎨 Image Optimization

The API automatically:
1. ✅ Converts images to WebP format (better compression)
2. ✅ Generates 3 variants:
   - Thumbnail: 150x150px
   - Medium: 800x600px
   - Large: 1920x1080px
3. ✅ Extracts dimensions and metadata
4. ✅ Preserves original aspect ratio

---

## 🔍 Retrieve Uploaded Media

### Get All Media
```
GET http://localhost:3035/api/cms/media
```

### Filter by Folder
```
GET http://localhost:3035/api/cms/media?folder=home-page
```

### Filter by Type
```
GET http://localhost:3035/api/cms/media?mimeType=image/webp
```

### Search by Tags
```
GET http://localhost:3035/api/cms/media?tags=hero,background
```

### Pagination
```
GET http://localhost:3035/api/cms/media?page=1&limit=20
```

---

## 💡 Best Practices

1. **Use Descriptive Names**: `hero-background.jpg` not `IMG_1234.jpg`
2. **Add Alt Text**: Always provide for accessibility
3. **Organize with Folders**: Group related images (home-page, products, etc.)
4. **Tag Appropriately**: Use relevant tags for easy searching
5. **Optimize Before Upload**: Compress large images before uploading
6. **Use Correct Variant**: Use thumbnail for small displays, large for heroes
7. **SVG for Logos**: Use SVG format for logos and icons (scalable)

---

## 📝 Quick Checklist

Before uploading:
- [ ] File is under 10MB
- [ ] File type is supported (jpg, png, webp, svg, mp4, webm)
- [ ] File name is descriptive
- [ ] Alt text prepared
- [ ] Folder name decided
- [ ] Tags prepared
- [ ] JWT token ready

After uploading:
- [ ] Copy the `url` from response
- [ ] Save the media ID for future reference
- [ ] Use appropriate variant URL (thumbnail, medium, large)
- [ ] Test the URL in browser

---

**Status**: ✅ Ready to Use
**Endpoint**: http://localhost:3035/api/cms/media/upload
**Max Size**: 10 MB
**Formats**: JPG, PNG, WebP, SVG, MP4, WebM
