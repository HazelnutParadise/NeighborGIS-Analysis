from enum import Enum
import os
import geopandas as gpd
from database.connect import POSTGIS_ENGINE
import concurrent.futures


# 🔧 所有要載入的地理資料（Enum 名稱 ➜ 檔案路徑）
GEO_FILES = {
    "TAIPEI_LANDUSE": "Input/zoning_regu.shp",
    "TAIWAN_LANDUSE": "Input/zoning_fixed.gpkg",
    "PUBLIC_LAND": "Input/land_public_fix.gpkg",
}


def load_data_into_db() -> Enum:
    """
    平行讀取地理檔案並寫入資料庫，建立 DBTableName Enum（表名為小寫）
    """
    tables = {}

    # 使用 ThreadPoolExecutor 進行平行處理
    with concurrent.futures.ThreadPoolExecutor() as executor:
        # 提交所有任務
        future_to_enum = {
            executor.submit(_insert_to_postgis, file_path, enum_name.lower()): enum_name
            for enum_name, file_path in GEO_FILES.items()
        }

        # 收集結果
        for future in concurrent.futures.as_completed(future_to_enum):
            enum_name = future_to_enum[future]
            try:
                # 獲取結果（若有）
                future.result()
                tables[enum_name] = enum_name.lower()
            except Exception as e:
                print(f"處理 {enum_name} 時發生錯誤: {e}")

    return Enum("DBTableName", tables)


def _insert_to_postgis(file_path: str, table_name: str):
    """
    讀取地理檔案，欄位轉小寫，匯入 PostGIS
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"{file_path} 不存在，請確認檔案路徑")

    df = gpd.read_file(file_path)
    df.columns = [col.lower() for col in df.columns]  # 欄位全小寫
    df.to_postgis(
        name=table_name,
        con=POSTGIS_ENGINE,
        if_exists="replace",
        index=False,
    )


DBTableName = load_data_into_db()
