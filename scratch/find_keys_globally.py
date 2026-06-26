import os
import re

search_dir = r"C:\Users\phina\.gemini\antigravity\brain"

def find_keys():
    print(f"Scanning {search_dir} recursively for API keys...")
    key_pattern = re.compile(r'sk-or-v1-[a-zA-Z0-9]{32,100}')
    
    if not os.path.exists(search_dir):
        print(f"Search directory does not exist: {search_dir}")
        return
        
    found_any = False
    for root, dirs, files in os.walk(search_dir):
        # Skip system generated logs to be fast
        if ".system_generated" in root:
            continue
            
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = key_pattern.findall(content)
                    for m in matches:
                        # Exclude mock keys
                        if "mock" not in m.lower() and "testing" not in m.lower():
                            print(f"🔑 FOUND KEY: {m} in {file_path}")
                            found_any = True
            except Exception as e:
                pass
                
    if not found_any:
        print("No valid OpenRouter keys found in App Data.")

if __name__ == "__main__":
    find_keys()
