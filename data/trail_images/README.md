# Trail Images Directory

This directory stores images for each trail. Images are organized by trail ID:

## Directory Structure:
```
data/trail_images/
├── trail_1/           # Images for trail with ID 1
│   ├── image1.jpg
│   ├── image2.jpg
│   └── ...
├── trail_2/           # Images for trail with ID 2
│   ├── image1.jpg
│   └── ...
└── ...
```

## Image Naming Convention:
- Use descriptive names: `trailhead.jpg`, `summit_view.jpg`, `wildflowers.jpg`
- Supported formats: JPG, PNG, GIF, WebP
- Keep file sizes reasonable (under 2MB each)

## How it works:
1. When you add images to a trail locally, they're stored as base64 in localStorage
2. Use the "Export Images" feature to convert base64 to actual files
3. The exported JSON will reference these image files instead of base64 data
4. When sharing, include both the JSON file and the image directories
