# 📁 Project Reorganization Plan

## Current Issues:
- 13 markdown files cluttering root directory
- Setup scripts mixed with core application files
- No clear separation between docs, guides, and code

---

## Proposed New Structure:

```
trailBlogger/
├── README.md                          # Main project documentation (KEEP IN ROOT)
├── LICENSE                            # License file (KEEP IN ROOT)
├── requirements.txt                   # Python dependencies (KEEP IN ROOT)
├── package.json                       # Node dependencies (KEEP IN ROOT)
├── .gitignore                         # Git ignore rules (KEEP IN ROOT)
│
├── src/                               # Application source code
│   ├── index.html                     # Main UI
│   ├── app.js                         # Application logic
│   ├── styles.css                     # Styling
│   ├── server.py                      # Backend server
│   └── data_manager.py                # Data handling
│
├── docs/                              # ALL DOCUMENTATION
│   ├── setup/                         # Setup and installation guides
│   │   ├── HOW_TO_RUN.md             # Server startup instructions
│   │   ├── QUICK_START.md            # Quick start guide
│   │   ├── install_backend.py        # Backend installer
│   │   └── setup_personal_data.py    # Data setup script
│   │
│   ├── guides/                        # User guides and tutorials
│   │   ├── IMAGE_UPLOAD_GUIDE.md     # Image upload instructions
│   │   ├── GEOREFERENCED_MAPS_GUIDE.md  # Maps guide
│   │   └── PERSISTENT_STORAGE.md     # Storage guide
│   │
│   ├── development/                   # Developer documentation
│   │   ├── deploy_guide.md           # Deployment instructions
│   │   ├── UPDATES_SUMMARY.md        # Recent updates log
│   │   └── COMMIT_MESSAGE.md         # Latest commit info
│   │
│   └── security/                      # Security and privacy docs
│       ├── SECURITY_ANALYSIS.md      # Security audit
│       ├── PRIVACY_CHECKLIST.md      # Privacy checklist
│       └── PRE_PUSH_CHECKLIST.md     # Pre-commit checks
│
├── scripts/                           # Utility scripts
│   ├── START_SERVER.bat              # Windows startup
│   ├── START_SERVER.sh               # Unix startup
│   └── Procfile                      # Heroku deployment
│
├── assets/                            # Static assets
│   └── logo/                         # Application branding
│       └── trailbloggerlibrary.png
│
├── data/                              # User data (git-ignored)
│   ├── README.md                     # Data directory info
│   ├── states.geojson                # Geographic data
│   ├── parks_simplified.json         # Park data
│   └── trail_images/                 # User photos (git-ignored)
│
└── samples/                           # Sample/template files
    ├── sample_data_template.json
    └── sample-trail.geojson
```

---

## Benefits:

1. **Cleaner Root Directory**
   - Only essential files (README, LICENSE, configs)
   - Immediately clear what the project is

2. **Better Documentation Organization**
   - Easy to find setup guides vs. user guides
   - Security docs separated from general docs

3. **Logical Source Code Location**
   - All app code in `src/`
   - Clear separation from configuration

4. **Utility Scripts Organized**
   - All scripts in one place
   - Easy to find startup scripts

5. **Scalability**
   - Room to grow documentation
   - Clear places for new guides/docs

---

## Migration Impact:

### Files That Need Code Updates:
- `index.html` - Update paths to CSS/JS (if moved to src/)
- `server.py` - Update paths to index.html (if moved to src/)
- References in documentation files

### Low-Risk Option:
- Keep `index.html`, `app.js`, `styles.css`, `server.py` in ROOT
- Only move documentation and scripts
- Minimal code changes needed

---

## Recommendation:

**Phase 1 (Low Risk):**
- Move all docs to `docs/` with subfolders
- Move scripts to `scripts/`
- Move samples to `samples/`
- Keep core app files in root

**Phase 2 (Future):**
- Move core app files to `src/` when ready
- Update all path references

