library(tidygeocoder)
library(sf)
library(osmdata)
library(leaflet)
library(dplyr)
library(jsonlite)
library(osmdata)
library(readxl)
# 設定dataframe向量
addresses <- data.frame(address = c(
  '臺北市中正區愛國西路1號'))
#--------------------------------------------------------------------------------------------------------

# 地理編碼轉座標(ARCGIS法)
geocoded_addresses <- addresses %>%  
  geocode(address = address, method = 'arcgis', lat = latitude, long = longitude)
print(geocoded_addresses)

#刪除舊檔
file.remove("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/test")
sf_geocoded <- st_as_sf(geocoded_addresses, coords = c("longitude", "latitude"), crs = 4326)
print(sf_geocoded)



# 創建 500 公尺緩衝區
buffer_distance <- 500 # 公尺
Addr_buffer <- st_buffer(sf_geocoded, dist = buffer_distance)%>% print()

# 定義 POI 類型
poi_types <- list(
  food = c("restaurant", "cafe", "fast_food"),
  health = c("hospital", "clinic", "pharmacy"),
  public = c("park", "library", "community_centre")
)

# 建立一個空的列表來儲存所有 POI 的 sf 物件
all_poi_sf_list <- list()

# 針對每一個捷運站的緩衝區進行 POI 搜尋
for (i in 1:nrow(Addr_buffer)) {
  station_buffer <- Addr_buffer[i, ] # 取得單個捷運站的緩衝區
  
  for (poi_category in names(poi_types)) {
    values <- poi_types[[poi_category]]
    cat(paste0("正在搜尋 ", poi_category, " (", paste(values, collapse = ", "), ")，在捷運站 ", MRT$車站名稱[i], " 周圍...\n"))
    
    # 使用單個捷運站緩衝區的範圍進行查詢
    poi_data <- station_buffer %>%
      st_bbox() %>%
      opq(timeout = 300) %>%
      add_osm_feature(key = "amenity", value = values) %>%
      osmdata_sf()
    
    # 將點和多邊形資料都加入列表，並標註類型和捷運站資訊
    if (!is.null(poi_data$osm_points) && nrow(poi_data$osm_points) > 0) {
      all_poi_sf_list[[length(all_poi_sf_list) + 1]] <- poi_data$osm_points %>%
        mutate(poi_type = poi_category, geometry_type = "point")
      cat(paste0("  找到 ", nrow(poi_data$osm_points), " 個點狀 ", poi_category, " POI\n"))
    }
    
    if (!is.null(poi_data$osm_polygons) && nrow(poi_data$osm_polygons) > 0) {
      all_poi_sf_list[[length(all_poi_sf_list) + 1]] <- poi_data$osm_polygons %>%
        mutate(poi_type = poi_category, geometry_type = "polygon")
      cat(paste0("  找到 ", nrow(poi_data$osm_polygons), " 個面狀 ", poi_category, " POI\n"))
    }
  }
}

# 將列表中的所有 sf 物件合併成一個 sf dataframe
all_poi_sf <- bind_rows(all_poi_sf_list)
mrt_poi_cleaned <- all_poi_sf %>% filter(!is.na(name))
print(paste0("原始資料列數：", nrow(all_poi_sf)))
print(paste0("清理後資料列數：", nrow(mrt_poi_cleaned)))
print(names(mrt_poi_cleaned))

file.remove("C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/poi_geo_buffered.gpkg")
# 現在 mrt_poi_cleaned 包含了每個捷運站 500 公尺範圍內的 POI

point_in_buffer <- mrt_poi_cleaned %>%
  st_filter(Addr_buffer, .predicate = st_within)

poi_geo <- 'C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/poi_geo_buffered.gpkg'
st_write(point_in_buffer, poi_geo , driver = 'GPKG', delete_layer = TRUE)

# 讀取 GeoJSON
mrt_poi <- st_read('C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/poi_geo_buffered.gpkg')%>% 
  select(addr.city, name, addr.full, addr.district,poi_type,geometry_type)
print(head(mrt_poi))

# 獲取地址座標
address_coords <- st_coordinates(sf_geocoded)

mrt_point_lines_sf <- mrt_poi %>%
  filter(geometry_type == "point") %>%
  st_transform(crs = st_crs(sf_geocoded)) %>% # 確保 CRS 一致
  mutate(
    geometry_line = st_sfc(st_linestring(matrix(c(st_coordinates(.)[1], st_coordinates(.)[2],
                                                  address_coords[1], address_coords[2]),
                                                ncol = 2, byrow = TRUE)), crs = st_crs(.))
  ) %>%
  st_as_sf()

st_geometry(mrt_point_lines_sf) <- mrt_point_lines_sf$geometry_line # 將新的線幾何替換舊的幾何欄位


# 處理多邊形 POI (計算質心並創建連接線的 sf 物件)
mrt_polygon_centroid_lines_sf <- mrt_poi %>%
  filter(geometry_type == "polygon") %>%
  st_transform(crs = st_crs(sf_geocoded)) %>% # 確保 CRS 一致
  st_centroid() %>% # 計算多邊形的質心
  rowwise() %>%
  mutate(
    geometry = st_sfc(st_linestring(matrix(c(st_coordinates(.), address_coords),
                                           ncol = 2, byrow = TRUE)), crs = st_crs(.))
  ) %>%
  st_as_sf()

st_geometry(mrt_polygon_centroid_lines_sf) <- mrt_polygon_centroid_lines_sf$geometry # 將新的線幾何替換舊的幾何欄位

st_geometry_type(mrt_point_lines_sf)
st_geometry_type(mrt_polygon_centroid_lines_sf)
# 創建 leaflet 地圖
mrt_point_food <- mrt_poi %>% filter(geometry_type=="point" & poi_type=="food")
mrt_point_health <- mrt_poi %>% filter(geometry_type=="point"& poi_type=="health" )
mrt_point_public <- mrt_poi %>% filter(geometry_type=="point" & poi_type=="public")
mrt_polygon <- mrt_poi %>% filter(geometry_type=="polygon" )
leaflet() %>%
  setView(121.5263, 25.04422, zoom = 11) %>%
  addProviderTiles("CartoDB.Positron") %>%
  addMarkers(
    data = sf_geocoded,
    popup = ~paste("<br>Address:", address),
    options = markerOptions(opacity = 0.8)
  ) %>% 
  addCircleMarkers( # 使用 addCircleMarkers
    data = mrt_point_food,
    popup = ~paste( "<br>營業地址:", addr.full,"<br>Name:",name),
    label = ~name,
    labelOptions = labelOptions(noHide = T,
                                style = list("color" = "blue", "font-size" = "10px")),
    color = "blue",
    fillOpacity = 0.8,
    radius = 2
  ) %>%
  addCircleMarkers( # 使用 addCircleMarkers
    data = mrt_point_health,
    popup = ~paste( "<br>營業地址:", addr.full,"<br>Name:",name),
    color = "green",
    fillOpacity = 0.8,
    radius = 2
  ) %>%
  addCircleMarkers( # 使用 addCircleMarkers
    data = mrt_point_public,
    popup = ~paste( "<br>營業地址:", addr.full,"<br>Name:",name),
    label = ~name,
    labelOptions = labelOptions(noHide = T,
                                style = list("color" = "orange", "font-size" = "10px")),
    color = "orange",
    fillOpacity = 0.8,
    radius = 2) %>% 
  addPolygons(
    data = mrt_polygon,
    popup = ~paste("<br>營業地址:", addr.full,"<br>Name:",name),
    fillColor = "black",      # 設定填充顏色
    color = "black",          # 設定邊框顏色
    weight = 0.5,             # 設定邊框粗細
    opacity = 0.5,            # 設定透明度
    fillOpacity = 0.3
  ) %>% addPolygons(
    data = Addr_buffer,
    fillColor = "red",      # 設定填充顏色
    color = "black",          # 設定邊框顏色
    weight = 0.5,             # 設定邊框粗細
    opacity = 0.5,            # 設定透明度
    fillOpacity = 0.3
  )
  


