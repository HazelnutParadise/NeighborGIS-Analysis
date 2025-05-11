from config.load_config import ENV

DEV_MODE = ENV["DEV_MODE"]

OLLAMA_BASE_URL = ENV["OLLAMA_BASE_URL"]

if DEV_MODE == "true":
    # Local development
    OLLAMA_BASE_URL = ENV["DEV_OLLAMA_BASE_URL"]
