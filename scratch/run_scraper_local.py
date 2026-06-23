import os
import sys

# Load secrets from the root .env file (never hardcode credentials)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../scraper")))
from env_loader import load_env
load_env()

import asyncio
from scraper import run_pipeline

if __name__ == "__main__":
    asyncio.run(run_pipeline())
