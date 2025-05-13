from sqlalchemy import create_engine, Engine

from config.consts import POSTGIS_HOST, POSTGIS_PORT, POSTGIS_USER, POSTGIS_PASSWORD

POSTGIS_ENGINE = None

# 替換使用者名稱、密碼、IP、資料庫名稱


def _create_postgis_engine() -> Engine:
    """
    Create a PostGIS engine using SQLAlchemy.
    """
    db_name = "neighborgis"

    # 使用者名稱、密碼、IP、資料庫名稱
    return create_engine(
        f"postgresql://{POSTGIS_USER}:{POSTGIS_PASSWORD}@{POSTGIS_HOST}:{POSTGIS_PORT}/{db_name}"
    )


POSTGIS_ENGINE = _create_postgis_engine()
