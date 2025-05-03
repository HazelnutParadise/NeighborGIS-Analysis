import os
import geopandas as gpd
from shapely.geometry import Point
from enum import Enum
import asyncio

from structs.adress_point import AddressPoint
from structs.zoing import Zoning
from utils.safe_extract import safe_extract
from utils.cache import smart_cache


class LandUseData(Enum):
    TAIPEI = 1
    TAIWAN = 2


async def intersect_with_zones(address_point: AddressPoint) -> Zoning:
    for landuse_data in LandUseData:
        print(f"Loading land use data: {landuse_data.name}")
        (_, land_simp),  poly_land = await asyncio.gather(
            _load_landuse_data(landuse_data),
            _load_public_land()
        )
        gdf_pts = _make_geoDataframe(address_point)
        pts_with_zone = _space_join(gdf_pts, land_simp)

        pts_pub = _mark_public_land(pts_with_zone, poly_land)
        if safe_extract(pts_pub['zone'][0]) is not None:
            break
    return Zoning(
        zone=safe_extract(pts_pub['zone'][0]),
        far=safe_extract(pts_pub['FAR'][0]),
        bcr=safe_extract(pts_pub['BCR'][0]),
        is_public_land=safe_extract(pts_pub['公有土地'][0]),
    )


@smart_cache()
async def _load_landuse_data(data: LandUseData) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    land: gpd.GeoDataFrame
    match data:
        case LandUseData.TAIPEI:
            land = _read_taipei_landuse()
        case LandUseData.TAIWAN:
            land = _read_taiwan_landuse()
        case _:
            raise ValueError("不支援的土地使用資料")
    land_simp: gpd.GeoDataFrame = _get_land_simp(land, data)
    return land, land_simp


def _read_taipei_landuse():
    shp_path = os.path.join("Input", "zoning_regu.shp")
    if not os.path.exists(shp_path):
        raise FileNotFoundError(f"{shp_path} 不存在，請確認檔案路徑")
    return gpd.read_file(shp_path)


def _read_taiwan_landuse() -> gpd.GeoDataFrame:
    # * 全台的土地使用分區，先不用
    full_zone_gpkg = "Input/zoning_fixed.gpkg"
    full_zone = gpd.read_file(full_zone_gpkg)
    return full_zone[full_zone.geometry.geom_type.isin(
        ["Polygon", "MultiPolygon"]
    )]


def _get_land_simp(landuse: gpd.GeoDataFrame, data: LandUseData) -> gpd.GeoDataFrame:
    """
    Get simplified land use data.
    """
    match data:
        case LandUseData.TAIPEI:
            return landuse[["zone", "FAR", "BCR", "geometry"]].copy()
        case LandUseData.TAIWAN:
            return landuse[["使用分", "容積率", "建蔽率", "geometry"]].copy().rename(
                columns={
                    "使用分": "zone",
                    "容積率": "FAR",
                    "建蔽率": "BCR"
                }
            )


def _make_geoDataframe(address_point: AddressPoint) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {
            "address": [address_point.address],
            "latitude": [address_point.coordinate.lat],
            "longitude": [address_point.coordinate.lng],
        },
        geometry=[
            Point(address_point.coordinate.lng, address_point.coordinate.lat)
        ],
        crs="EPSG:4326",
    )


def _space_join(gdf_pts: gpd.GeoDataFrame, land_simp: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    return gpd.sjoin(
        gdf_pts,
        land_simp,
        how="left",
        predicate="within"
    ).drop(
        columns=["index_right"]
    )


@smart_cache()
async def _load_public_land() -> gpd.GeoDataFrame:
    public_gpkg = os.path.join("Input", "land_public_fix.gpkg")

    def sync_load():
        land_public = gpd.read_file(public_gpkg)
        land_public_simp = land_public[["Name", "Area", "geometry"]].copy()
        return land_public_simp[
            land_public_simp.geometry.geom_type.isin(
                ["Polygon", "MultiPolygon"]
            )
        ]

    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, sync_load)


@smart_cache()
def _mark_public_land(pts_with_zone: gpd.GeoDataFrame, poly_land: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    # 先做空間連接，再根據是否有匹配到多邊形來標記
    pts_pub = gpd.sjoin(
        pts_with_zone,
        poly_land,
        how="left",
        predicate="within"
    ).rename(
        columns={"Name": "公有土地名稱"}
    )

    # 如果 sjoin 後 '公有土地名稱' 為 NaN，就標為 N，否則 Y
    pts_pub["公有土地"] = pts_pub["公有土地名稱"].notna().map({True: "Y", False: "N"})
    return pts_pub
