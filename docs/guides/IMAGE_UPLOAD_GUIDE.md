# Image Upload System Guide

## Overview
Trail Blogger now includes an enhanced image handling system with automatic compression, file size limits, and better storage management.

## File Size Limits

### Individual Image Limits
- **Maximum per image**: 2MB
- **Recommended**: 1MB or less for optimal performance
- **Format support**: JPEG, PNG, WebP, GIF

### Total Upload Limits
- **Maximum images per trail**: 10 images
- **Maximum total size**: 10MB per upload session
- **Storage optimization**: Automatic compression applied

## How It Works

### 1. File Selection
- Select up to 10 images at once
- System automatically checks file sizes
- Shows real-time file size information
- Prevents oversized files from being processed

### 2. Automatic Compression
- **WebP format** (when supported by browser) for best compression
- **JPEG fallback** for broader compatibility
- **Dynamic compression** based on storage usage:
  - Normal usage (0-3MB): 700px width, 70% quality
  - Moderate usage (3-5MB): 600px width, 60% quality
  - High usage (5-7MB): 600px width, 60% quality
  - Critical usage (7+MB): 400px width, 40% quality

### 3. Storage Management
- Images stored as compressed base64 strings in localStorage
- Automatic cleanup of old backups
- Storage usage warnings when approaching limits
- Backup/restore functionality for data safety

## Browser Compatibility

### WebP Support
- **Chrome/Edge**: Full WebP support (best compression)
- **Firefox**: Full WebP support (best compression)
- **Safari**: Limited WebP support (falls back to JPEG)
- **IE**: No WebP support (JPEG only)

### localStorage Limits
- **Chrome/Edge**: 5-10MB per domain
- **Firefox**: 5-10MB per domain
- **Safari**: 5-10MB per domain
- **Mobile browsers**: May have lower limits

## Best Practices

### For Users
1. **Resize images** before uploading (recommended: 1200px max width)
2. **Use JPEG format** for photos (smaller file sizes)
3. **Keep images under 1MB** for faster uploads
4. **Create regular backups** of your trail data

### For Developers
1. **Monitor localStorage usage** with `checkLocalStorageUsage()`
2. **Use WebP when possible** for better compression
3. **Implement progressive compression** based on storage
4. **Provide clear user feedback** on file limits

## Error Handling

### Common Issues
- **File too large**: Individual image exceeds 2MB limit
- **Too many images**: Exceeds 10 image maximum
- **Storage full**: Approaching localStorage limits
- **Unsupported format**: Non-image file selected

### User Messages
- Clear error messages with specific limits
- File size information displayed in preview
- Real-time validation during selection
- Helpful suggestions for resolution

## Technical Details

### Compression Algorithm
```javascript
// Dynamic compression based on storage usage
if (currentUsage > 7) {
    compressionQuality = 0.4;  // Very aggressive
    compressionWidth = 400;
} else if (currentUsage > 5) {
    compressionQuality = 0.6;  // More aggressive
    compressionWidth = 600;
} else if (currentUsage > 3) {
    compressionQuality = 0.7;  // Moderate
    compressionWidth = 700;
}
```

### File Validation
```javascript
// Check individual file size
if (file.size > 2 * 1024 * 1024) {
    alert(`Image too large: ${fileSizeMB.toFixed(1)}MB`);
    continue;
}

// Check total upload size
if (totalSizeMB > 10) {
    alert(`Total size exceeds 10MB limit`);
    return;
}
```

## Performance Considerations

### Upload Speed
- **Small files (<1MB)**: Near-instant processing
- **Medium files (1-2MB)**: 1-3 seconds processing
- **Large files (2MB)**: 3-5 seconds processing

### Storage Efficiency
- **Original JPEG**: ~2MB → **Compressed WebP**: ~200-400KB
- **Original PNG**: ~3MB → **Compressed WebP**: ~300-500KB
- **Overall reduction**: 70-85% smaller storage footprint

### Memory Usage
- **Peak memory**: 2-3x original file size during processing
- **Garbage collection**: Automatic cleanup after compression
- **Browser limits**: Varies by device and available RAM

## Troubleshooting

### If Images Won't Upload
1. Check file size (must be under 2MB)
2. Verify file format (images only)
3. Check total image count (max 10)
4. Clear browser cache and try again

### If Storage is Full
1. Create a backup of current data
2. Remove some old images
3. Use more aggressive compression
4. Consider exporting data to file

### If Compression is Too Aggressive
1. Check current storage usage
2. Remove old backups
3. Clear unused trail data
4. Monitor localStorage with browser dev tools

## Future Enhancements

### Planned Features
- **IndexedDB storage** for larger capacity
- **Cloud storage integration** for unlimited images
- **Advanced compression options** (user-selectable quality)
- **Batch processing** for multiple trails
- **Image metadata preservation** (EXIF data)

### Performance Improvements
- **Web Workers** for background compression
- **Streaming uploads** for very large files
- **Progressive JPEG** for faster previews
- **Lazy loading** for image galleries
