import os

def load_env():
    """
    Locates the nearest .env file starting from this script's directory and going up,
    then parses and injects its variables into os.environ.
    """
    current_dir = os.path.abspath(os.path.dirname(__file__))
    for _ in range(4):
        env_path = os.path.join(current_dir, '.env')
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        if '=' in line:
                            parts = line.split('=', 1)
                            k = parts[0].strip()
                            v = parts[1].strip()
                            # Strip quotes
                            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                                v = v[1:-1]
                            os.environ[k] = v
                break
            except Exception as e:
                print(f"Error loading .env at {env_path}: {e}")
        parent_dir = os.path.dirname(current_dir)
        if parent_dir == current_dir:
            break
        current_dir = parent_dir
