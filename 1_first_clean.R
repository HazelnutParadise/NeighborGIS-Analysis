library(tidygeocoder)
library(sf)
library(dplyr)
library(readr)
library(ggplot2)
library(ggspatial)
library(leaflet)
library(geojsonio)
#建立我存放資料的資料夾
dir.create('input')
options(encoding = "UTF8")

#畫土地使用分區

# 檢查檔案是否存在會回傳TRUE
file.exists("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/Zoning/zoning_regu.shp") 
# 定義檔案為land向量
land <- "C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/Zoning/zoning_regu.shp"
# 然後讀取向量
land <- st_read("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/Zoning/zoning_regu.shp")

#plot(land)
# 地址轉座標
#--------------------------------------------------------------------------------------------------------
# 設定dataframe向量
addresses <- data.frame(address = c(
  "No. 101號, Section 2, Zhongcheng Rd, Shilin District, Taipei City, 11153",'臺北市中正區愛國西路1號'),
  id = c("A",'B'))
#--------------------------------------------------------------------------------------------------------

# 地理編碼轉座標(ARCGIS法)
geocoded_addresses <- addresses %>%  
  geocode(address = address, method = 'arcgis', lat = latitude, long = longitude)
print(geocoded_addresses)
#--------------------------------------------------------------------------------------------------------

# 清理地址格式
addresses$address <- addresses$address %>%
  trimws() %>%
  gsub("[[:punct:]]", "", .)
#--------------------------------------------------------------------------------------------------------
#刪除舊檔geojson
file.remove("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test")

#將編碼轉向量點位Convert foreign object to an sf object
sf_geocoded <- st_as_sf(geocoded_addresses, coords = c("longitude", "latitude"), crs = 4326)
print(sf_geocoded)
dir.create('ouput')
output_path_shp <- "C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test"
print('output_path_shp')
#--------------------------------------------------------------------------------------------------------

#讀入轉換後的檔案
st_write(sf_geocoded, output_path_shp, driver = "GeoJSON")
file.exists("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test")
output <- "C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test"
output <- st_read("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test")

#--------------------------------------------------------------------------------------------------------

#用ggplot繪製表格座標圖
ggplot() +
  geom_sf(data = sf_geocoded, aes(color = id), size = 3) +  # 繪製點位，用 id 欄位來區分顏色
  coord_sf(crs = 4326) +  # 設定地圖的座標系統 (與資料相同)
  labs(
    title = "地理編碼結果",
    x = "經度",
    y = "緯度",
    color = "地點 ID"
  ) 
location_data <- output
print(nrow(location_data))  # 應為 3
#--------------------------------------------------------------------------------------------------------

# 讀取 GeoJSON
location_data <- st_read('C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test')

# 創建 leaflet 地圖
leaflet() %>%
  setView(121.5263, 25.04422, zoom = 11) %>%
  addTiles() %>%
  addMarkers(
    data = output,
    popup = ~paste("ID:", id, "<br>Address:", address),
    options = markerOptions(opacity = 0.8)
  )


# 讀取 SHP 檔案，並立即使用 select() 選擇需要的欄位
land_simplified <- land %>%
  select(c(zone,FAR,BCR, geometry)) # 保留 "分區簡稱" 欄位和幾何資訊

# 查看簡化後的 land 物件
print(land_simplified)


#檢查分區與地址是否有重疊
point_with_landuse <- st_join(output, land_simplified, join = st_within)
print(point_with_landuse)

#--------------------------------------------------------------------------------------------------------
land_public <- 'C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/land_public_fix.gpkg'
land_public <- st_read('C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/land_public_fix.gpkg')
land_pub_simp <- land_public %>%
  select(c(Name,Area)) # 保留 "公有土地名稱" 欄位和幾何資訊
polygon_land <- land_pub_simp %>%
  filter(st_geometry_type(.) %in% c("POLYGON", "MULTIPOLYGON"))

#--------------------------------------------------------------------------------------------------------
file.exists('C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/zoning/zoning_fixed.gpkg')
output <- 'C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/zoning/zoning_fixed.gpkg'
output <- st_read('C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/input/zoning/zoning_fixed.gpkg')

full_zone  <- output %>%
  filter(st_geometry_type(.) %in% c("POLYGON", "MULTIPOLYGON"))

#--------------------------------------------------------------------------------------------------------

# 查詢點位是否在公有土地上並新增欄位
point_with_public_land_flag <- point_with_landuse %>%
  mutate(
    公有土地 = ifelse(lengths(st_within(., polygon_land)) > 0, "Y", "N")
  )
print(point_with_public_land_flag)

# 創建 leaflet 地圖查詢分區
leaflet() %>%
  setView(121.5263, 25.04422, zoom = 11) %>%
  addProviderTiles("CartoDB.Positron") %>%
  addMarkers(
    data = point_with_public_land_flag,
    popup = ~paste("ID:", id, "<br>Address:", address,"<br>使用分區:",zone,"<br>容積率:",FAR,"<br>建蔽率:",BCR,
                   "<br>是否為公有土地:",公有土地),
    options = markerOptions(opacity = 0.8))%>%
  #--------------------------------------------------------------------------------------------------------
  addPolygons(
    data = polygon_land,
    popup = ~paste("名稱:", Name,"面積:", Area),
    fillColor = "red",       # 設定填充顏色
    color = "black",           # 設定邊框顏色
    weight = 1,                # 設定邊框粗細
    opacity = 0,             # 設定透明度
    fillOpacity = 0.5,         # 設定填充透明度
    highlightOptions = highlightOptions(
      weight = 5,
      color = "#666",
      fillOpacity = 0.9,
      bringToFront = TRUE,
    ),group = "公有土地",
    label = ~as.character(Name), # 如果你想顯示標籤，替換為你的屬性欄位
  ) %>%
  #--------------------------------------------------------------------------------------------------------

  addPolygons(
    data = full_zone,
    popup = ~paste("計畫區名稱:", 計畫_1,"使用分區:", 使用分),
    fillColor = "black",       # 設定填充顏色
    color = "black",           # 設定邊框顏色
    weight = 0.5,                # 設定邊框粗細
    opacity = 0.5,             # 設定透明度
    fillOpacity = 0.3
    ,group = "土地使用分區"
)%>% # 如果你想顯示標籤，替換為你的屬性欄位

addLayersControl(
  overlayGroups = c('土地使用分區', '公有土地'), # 字串向量包含所有群組名稱
  options = layersControlOptions(collapsed = FALSE)
)

