import os
import shutil
import glob

print("Starting layout fix...")

# Merge backend into app
if os.path.exists("backend"):
    if not os.path.exists("app"):
        os.rename("backend", "app")
    else:
        for item in os.listdir("backend"):
            s = os.path.join("backend", item)
            d = os.path.join("app", item)
            if os.path.isdir(s):
                if not os.path.exists(d):
                    shutil.move(s, d)
                else:
                    # just move contents
                    for sub in os.listdir(s):
                        shutil.move(os.path.join(s, sub), os.path.join(d, sub))
            else:
                shutil.move(s, d)
        
        try:
            os.rmdir("backend")
            print("Removed backend folder")
        except:
            pass

# Fix the python imports
print("Fixing imports...")
files = glob.glob("app/**/*.py", recursive=True) + ["run.py"]
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        new_content = content.replace('from backend', 'from app').replace('import backend', 'import app')
        if content != new_content:
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f"Fixed imports in {f}")
    except Exception as e:
        print(f"Error in {f}: {e}")

print("Done!")
