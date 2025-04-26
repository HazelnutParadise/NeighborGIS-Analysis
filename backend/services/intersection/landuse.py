import os
import geopandas as gpd


def read_shp():
    shp_path = os.path.join("Input", "zoning_regu.shp")
    if not os.path.exists(shp_path):
        raise FileNotFoundError(f"{shp_path} 不存在，請確認檔案路徑")
    return gpd.read_file(shp_path)


if __name__ == "__main__":
    land = read_shp()
    print(land)
