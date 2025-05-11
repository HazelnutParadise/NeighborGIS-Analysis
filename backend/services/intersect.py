import asyncio
from enum import Enum
from sqlalchemy import text
from database.connect import POSTGIS_ENGINE
from database.load_data import DBTableName
from structs.adress_point import AddressPoint
from structs.zoing import Zoning
from utils.safe_extract import safe_extract


# 用於表示資料類型，不綁定表名
class LandUseData(Enum):
    TAIPEI = 1
    TAIWAN = 2


# 對應表名 Enum 來自 load_data_into_db()
# DBTableName.TAIPEI_LANDUSE.value => "taipei_landuse"


async def intersect_with_zones(address_point: AddressPoint) -> Zoning:
    pt_wkt = f"SRID=4326;POINT({address_point.coordinates.lng} {address_point.coordinates.lat})"

    zone_row = None

    for landuse in (LandUseData.TAIPEI, LandUseData.TAIWAN):
        # 對應表名
        table = {
            LandUseData.TAIPEI: DBTableName.TAIPEI_LANDUSE.value,
            LandUseData.TAIWAN: DBTableName.TAIWAN_LANDUSE.value,
        }[landuse]

        # 因欄位名稱不同需動態切換
        columns = {
            LandUseData.TAIPEI: "zone, far, bcr",
            LandUseData.TAIWAN: '"使用分" AS zone, "容積率" AS far, "建蔽率" AS bcr',
        }[landuse]

        sql = text(f"""
            SELECT {columns}
            FROM {table}
            WHERE ST_Within(
                ST_GeomFromText(:pt_wkt, 4326),
                geometry
            )
            LIMIT 1
        """)
        with POSTGIS_ENGINE.connect() as conn:
            result = conn.execute(sql, {"pt_wkt": pt_wkt}).mappings().first()
        if result:
            zone_row = result
            break

    # 查詢公有地
    sql_pub = text(f"""
        SELECT 1
        FROM {DBTableName.PUBLIC_LAND.value}
        WHERE ST_Within(
            ST_GeomFromText(:pt_wkt, 4326),
            geometry
        )
        LIMIT 1
    """)
    with POSTGIS_ENGINE.connect() as conn:
        is_pub = conn.execute(sql_pub, {"pt_wkt": pt_wkt}).scalar()
        is_public = "Y" if is_pub else "N"

    return Zoning(
        zone=safe_extract(zone_row["zone"]) if zone_row else None,
        far=f if (f := safe_extract(
            zone_row["far"])) != "0" else None if zone_row else None,
        bcr=b if (b := safe_extract(
            zone_row["bcr"])) != "0" else None if zone_row else None,
        is_public_land=is_public,
    )
