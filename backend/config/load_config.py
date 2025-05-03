import pydotenv
import os

# 嘗試使用絕對路徑或更可靠的相對路徑計算
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, "..", "..", ".env")

ENV = None

try:
    ENV = pydotenv.Environment(file_path=env_path, check_file_exists=True)
    print("Successfully loaded .env file.")
    print("Loaded environment variables:")
    # Print the loaded environment variables for debugging
    for key, value in ENV.items():
        print(f"{key}: {value}")
except FileNotFoundError:
    print(f"Error: .env file not found at {env_path}")
except Exception as e:
    print(f"An error occurred: {e}")
