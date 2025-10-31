# Quick Deploy Reference Card

## 🚀 Deploy Changes from localhost:5000 to GitHub Pages

### The Simple Way (Automated)

```bash
python deploy.py
```

That's it! The script will:
- ✅ Check your data is valid
- ✅ Show you what changed
- ✅ Create a backup
- ✅ Commit and push to GitHub
- ✅ Give you the live URL

---

### The Manual Way

```bash
# 1. Check what changed
git status

# 2. Add files
git add data/trails.geojson data/trail_images/

# 3. Commit
git commit -m "Update trails: your description here"

# 4. Push
git push origin main

# 5. Wait 2 minutes, then visit:
# https://realcaddish.github.io/trailBlogger/
```

---

### Verify Deployment

```bash
python verify_deployment.py
```

Shows if your local and live sites match.

---

### Full Workflow

1. **Edit on Flask:** http://localhost:5000
2. **Deploy:** `python deploy.py`
3. **Verify:** `python verify_deployment.py`
4. **Check live:** https://realcaddish.github.io/trailBlogger/

---

### Common Commands

```bash
# Start Flask server
python server.py

# Deploy changes
python deploy.py

# Verify deployment
python verify_deployment.py

# See what changed
git status
git diff data/trails.geojson
```

---

### Troubleshooting

**Images not showing?**
```bash
git add data/trail_images/
git commit -m "Add missing images"
git push origin main
```

**Old data on live site?**
- Hard refresh: `Ctrl+F5` or `Cmd+Shift+R`
- Wait 2-3 minutes for GitHub Pages rebuild

**Need to undo changes?**
```bash
# See recent commits
git log --oneline -5

# Revert to previous commit
git revert HEAD
git push origin main
```

---

**Read full documentation:** `DEPLOYMENT_WORKFLOW.md`

