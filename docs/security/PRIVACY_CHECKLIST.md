# 🔒 Privacy Checklist for Trail Blogger

Use this checklist to ensure your personal trail data remains private and secure.

## ✅ Before Making Repository Public

### 1. Verify .gitignore Configuration
- [ ] `data/` directory is excluded
- [ ] `uploads/` directory is excluded
- [ ] `images/` directory is excluded
- [ ] `*.backup` files are excluded
- [ ] `backup_*.json` files are excluded
- [ ] `trailblogger_backup_*.json` files are excluded

### 2. Check for Personal Data in Repository
- [ ] No personal photos in any directory
- [ ] No trail coordinates with personal locations
- [ ] No journal entries or blog posts
- [ ] No personal information in configuration files
- [ ] No backup files containing personal data

### 3. Test with Fresh Clone
- [ ] Clone repository to a new location
- [ ] Verify no personal data is included
- [ ] Test that application works without personal data
- [ ] Confirm data directory is created fresh

### 4. Update Documentation
- [ ] README explains data privacy
- [ ] Setup instructions are clear
- [ ] Privacy notice is prominent
- [ ] Users understand data stays local

## ✅ Regular Privacy Maintenance

### 1. Data Backup
- [ ] Create regular backups using the application
- [ ] Store backups in multiple locations
- [ ] Test backup restoration periodically
- [ ] Keep backups separate from code repository

### 2. Repository Updates
- [ ] Review changes before committing
- [ ] Ensure no personal data is accidentally included
- [ ] Test changes don't expose personal information
- [ ] Update privacy documentation if needed

### 3. Security Practices
- [ ] Keep application updated
- [ ] Use strong passwords if adding authentication
- [ ] Regularly review file permissions
- [ ] Monitor for any data leaks

## ✅ For Users Setting Up Their Own Instance

### 1. Initial Setup
- [ ] Run `setup_personal_data.py` script
- [ ] Verify data directory is created
- [ ] Confirm .gitignore is in place
- [ ] Test that data persists locally

### 2. Data Management
- [ ] Import trails using GeoJSON files
- [ ] Add photos and descriptions
- [ ] Create regular backups
- [ ] Keep backups in secure locations

### 3. Privacy Verification
- [ ] No data is sent to external servers
- [ ] All storage is local
- [ ] Backups contain only your data
- [ ] No personal information in logs

## 🚨 Warning Signs

### Red Flags to Watch For
- [ ] Personal photos appearing in repository
- [ ] Trail coordinates with your actual locations
- [ ] Journal entries or blog posts in code
- [ ] Backup files in version control
- [ ] Personal information in configuration files

### If You Find Personal Data Exposed
1. **Immediately remove** the data from the repository
2. **Check git history** for any commits containing personal data
3. **Consider repository history** - you may need to rewrite git history
4. **Update .gitignore** to prevent future exposure
5. **Review all files** for any remaining personal information

## 📋 Best Practices

### For Repository Owners
- Never commit personal data
- Use .gitignore effectively
- Test with fresh clones regularly
- Keep documentation updated
- Monitor for accidental data exposure

### For Users
- Keep personal data separate from code
- Use regular backups
- Store backups securely
- Understand that data stays local
- Report any privacy concerns

## 🔍 Verification Commands

### Check What's Tracked by Git
```bash
# See what files are tracked
git ls-files

# Check for data files
git ls-files | grep -E "(data|images|backup|trails)"

# Verify .gitignore is working
git status --ignored
```

### Test Fresh Clone
```bash
# Clone to new location
git clone <repository-url> test-clone
cd test-clone

# Check for personal data
ls -la data/ 2>/dev/null || echo "No data directory (good!)"
find . -name "*.json" -exec grep -l "personal" {} \; 2>/dev/null || echo "No personal data found (good!)"
```

## 📞 Support

If you find any privacy issues or have concerns:
1. Check this checklist first
2. Review the documentation
3. Test with a fresh clone
4. Report issues to the repository maintainer

---

**Remember**: Your personal trail data is yours alone. This application is designed to keep it private and secure on your local machine.
