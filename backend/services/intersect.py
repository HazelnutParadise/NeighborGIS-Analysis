import os
import geopandas as gpd
from shapely.geometry import Point
from enum import Enum


from structs.adress_point import AddressPoint
from structs.zoing import Zoning


class LandUseData(Enum):
    TAIPEI = 1
    TAIWAN = 2


def intersect_with_zones(address_point: AddressPoint) -> Zoning:
    # todo: 疊圖做交集，最後回傳 HTML 地圖
    land, land_simp = _load_landuse_data(LandUseData.TAIPEI)
    gdf_pts: gpd.GeoDataFrame = _make_geoDataframe(address_point)
    pts_with_zone: gpd.GeoDataFrame = _space_join(gdf_pts, land_simp)
    poly_land = _load_public_land()
    pts_pub = _mark_public_land(pts_with_zone, poly_land)
    return Zoning(
        zone=pts_pub['zone'][0],
        far=pts_pub['FAR'][0],
        bcr=pts_pub['BCR'][0],
        is_public_land=pts_pub['公有土地'][0],
    )


def _load_landuse_data(data: LandUseData) -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    land: gpd.GeoDataFrame
    match data:
        case LandUseData.TAIPEI:
            land = _read_taipei_landuse_shp()
        case LandUseData.TAIWAN:
            land = _read_taiwan_landuse()
        case _:
            raise ValueError("不支援的土地使用資料")
    land_simp: gpd.GeoDataFrame = _get_land_simp(land, data)
    return land, land_simp


def _read_taipei_landuse_shp():
    shp_path = os.path.join("Input", "zoning_regu.shp")
    if not os.path.exists(shp_path):
        raise FileNotFoundError(f"{shp_path} 不存在，請確認檔案路徑")
    return gpd.read_file(shp_path)


def _read_taiwan_landuse() -> gpd.GeoDataFrame:
    # * 全台的土地使用分區，先不用
    full_zone_gpkg = "Input/zoning_fixed.gpkg"
    full_zone = gpd.read_file(full_zone_gpkg)
    full_zone = full_zone[full_zone.geometry.geom_type.isin(
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
            return landuse[["zone", "geometry"]].copy()


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


def _load_public_land() -> gpd.GeoDataFrame:
    public_gpkg = os.path.join("Input", "land_public_fix.gpkg")
    land_public = gpd.read_file(public_gpkg)
    land_public_simp = land_public[["Name", "Area", "geometry"]].copy()
    return land_public_simp[
        land_public_simp.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
    ]


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
