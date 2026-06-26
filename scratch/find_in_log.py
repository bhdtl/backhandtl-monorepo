import sys

sys.stdout.reconfigure(encoding='utf-8')

def find_term(term):
    log_path = r"C:\Users\phina\.gemini\antigravity\brain\df764a91-5cc0-4b7e-b365-90d908c05467\.system_generated\tasks\task-6904.log"
    with open(log_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, l in enumerate(lines):
        if term.lower() in l.lower():
            print(f"--- Line {i+1} ---")
            start = max(0, i - 5)
            end = min(len(lines), i + 6)
            for j in range(start, end):
                prefix = "=> " if j == i else "   "
                print(f"{prefix}{j+1}: {lines[j].strip()}")

if __name__ == '__main__':
    term = sys.argv[1] if len(sys.argv) > 1 else "Burruchaga"
    find_term(term)
