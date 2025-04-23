from geopy.geocoders import ArcGIS
import pandas as pd
import time

# 初始化匿名 ArcGIS geocoder
geolocator = ArcGIS(timeout=10)

# 測試地址
df = pd.DataFrame({
    'id': ['A', 'B'],
    'address': [
        'No. 101號, Section 2, Zhongcheng Rd, Shilin District, Taipei City, 11153',
        '臺北市中正區愛國西路1號'
    ]
})

# 查詢函式
def arcgis_geocode_free(addr):
    try:
        location = geolocator.geocode(addr)
        time.sleep(1)  # 禮貌性加個 delay
        if location:
            return pd.Series({'latitude': location.latitude, 'longitude': location.longitude})
    except:
        return pd.Series({'latitude': None, 'longitude': None})

# 批次轉換
df[['latitude', 'longitude']] = df['address'].apply(arcgis_geocode_free)

print(df)
