#!/usr/bin/env python3
"""Check all trail names for potential duplicates"""

import json
from collections import defaultdict

with open('data/trails.geojson', 'r', encoding='utf-8') as f:
    data = json.load(f)

features = data.get('features', [])

print("=" * 70)
print("ALL TRAIL NAMES")
print("=" * 70)
print(f"\nTotal trails: {len(features)}\n")

# List all trail names
trail_names = []
for i, feature in enumerate(features):
    name = feature['properties'].get('name', '').strip()
    trail_names.append((i, name))
    print(f"{i:2d}. {name}")

# Check for similar names
print("\n" + "=" * 70)
print("CHECKING FOR SIMILAR NAMES")
print("=" * 70)

# Group by name (exact match)
name_groups = defaultdict(list)
for i, name in trail_names:
    name_groups[name].append(i)

# Find exact duplicates
exact_duplicates = {k: v for k, v in name_groups.items() if len(v) > 1}
if exact_duplicates:
    print("\nExact duplicate names found:")
    for name, indices in exact_duplicates.items():
        print(f"  '{name}': {len(indices)} copies at indices {indices}")
else:
    print("\nNo exact duplicate names found.")

# Check for similar names (fuzzy match)
print("\nChecking for similar names (potential duplicates):")
similar_pairs = []
for i, name1 in enumerate(trail_names):
    for j, name2 in enumerate(trail_names[i+1:], start=i+1):
        # Remove apostrophes and normalize
        n1 = name1[1].lower().replace("'", "").replace("'", "")
        n2 = name2[1].lower().replace("'", "").replace("'", "")
        # Remove extra spaces
        n1 = " ".join(n1.split())
        n2 = " ".join(n2.split())
        
        if n1 == n2 and name1[1] != name2[1]:
            similar_pairs.append((name1, name2))
            print(f"  Similar names found:")
            print(f"    '{name1[1]}' (index {name1[0]})")
            print(f"    '{name2[1]}' (index {name2[0]})")
            print(f"    Normalized: '{n1}'")

if not similar_pairs:
    print("  No similar names found.")

