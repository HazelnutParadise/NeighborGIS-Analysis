from geopy.geocoders import ArcGIS

from structs.adress_point import Coordinate

# 初始化匿名 ArcGIS geocoder
geolocator = ArcGIS(timeout=10)


def arcgis_geocode(addr: str) -> Coordinate:
    try:
        location = geolocator.geocode(addr)
        if location:
            return Coordinate(lat=location.latitude, lng=location.longitude)
    except:
        return Coordinate(lat=None, lng=None)
