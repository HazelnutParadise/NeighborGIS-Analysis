from geopy.geocoders import ArcGIS

from structs.adress_point import Coordinates

# 初始化匿名 ArcGIS geocoder
geolocator = ArcGIS(timeout=10)


def arcgis_geocode(addr: str) -> Coordinates:
    try:
        location = geolocator.geocode(addr)
        if location:
            return Coordinates(lat=location.latitude, lng=location.longitude)
    except:
        return Coordinates(lat=None, lng=None)
