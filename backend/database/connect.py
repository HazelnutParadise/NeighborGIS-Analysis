from sqlalchemy import create_engine

from config.consts import POSTGIS_HOST, POSTGIS_PORT, POSTGIS_USER, POSTGIS_PASSWORD

POSTGIS_ENGINE = None

# 替換使用者名稱、密碼、IP、資料庫名稱


def create_postgis_engine():
    """
    Create a PostGIS engine using SQLAlchemy.
    """
    db_name = "neighborgis"
    global POSTGIS_ENGINE
    # 使用者名稱、密碼、IP、資料庫名稱
    POSTGIS_ENGINE = create_engine(
        f"postgresql://{POSTGIS_USER}:{POSTGIS_PASSWORD}@{POSTGIS_HOST}:{POSTGIS_PORT}/{db_name}"
    )
