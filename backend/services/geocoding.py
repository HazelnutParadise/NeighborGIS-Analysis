from geopy.geocoders import ArcGIS
import pandas as pd

# 初始化匿名 ArcGIS geocoder
geolocator = ArcGIS(timeout=10)


def arcgis_geocode(addr: str) -> pd.Series:
    try:
        location = geolocator.geocode(addr)
        if location:
            return pd.Series({'latitude': location.latitude, 'longitude': location.longitude})
    except:
        return pd.Series({'latitude': None, 'longitude': None})


if __name__ == "__main__":
    # 測試地址
    df = pd.DataFrame({
        'id': ['A', 'B'],
        'address': [
            'No. 101號, Section 2, Zhongcheng Rd, Shilin District, Taipei City, 11153',
            '臺北市中正區愛國西路1號'
        ]
    })

    # 批次轉換
    df[['latitude', 'longitude']] = df['address'].apply(arcgis_geocode)

    print(df)
