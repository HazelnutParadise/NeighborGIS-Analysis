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
  '100台北市中正區愛國西路1號'))

# 地理編碼轉座標(ARCGIS法)
geocoded_addresses <- addresses %>%
  geocode(address = address, method = 'arcgis', lat = latitude, long = longitude)
print(geocoded_addresses)

sf_geocoded <- st_as_sf(geocoded_addresses, coords = c("longitude", "latitude"), crs = 4326)
print(sf_geocoded)


# 創建 500 公尺緩衝區
buffer_distance <- 1000 # 公尺
Addr_buffer <- st_buffer(sf_geocoded, dist = buffer_distance) %>% print()

# 定義不同的緩衝區半徑
buffer_distances <- c(300, 500, 1000)

# 創建一個空的列表來儲存不同範圍的緩衝區線段
all_buffer_lines <- list()

# 針對每個緩衝區半徑進行處理
for (dist in buffer_distances) {
  # 創建指定半徑的緩衝區
  current_buffer <- st_buffer(sf_geocoded, dist = dist)
  
  # 將緩衝區轉換為線段
  buffer_lines <- st_cast(current_buffer, "LINESTRING") %>%
    mutate(環域範圍 = dist) # 創建並填入標示範圍的欄位
  
  # 將處理後的線段加入列表
  all_buffer_lines[[length(all_buffer_lines) + 1]] <- buffer_lines
}

# 將列表中的所有緩衝區線段合併成一個 sf 物件
multi_buffer_lines <- bind_rows(all_buffer_lines)
multi_buffer_lines
# 定義 POI 類型
poi_types <- list(
  food = c("restaurant", "cafe", "fast_food"),
  health = c("hospital", "clinic", "pharmacy"),
  public = c("park", "library", "community_centre")
)

# 建立一個空的列表來儲存所有 POI 的 sf 物件
all_poi_sf_list <- list()

# 針對每一個緩衝區進行 POI 搜尋
for (i in 1:nrow(Addr_buffer)) {
  station_buffer <- Addr_buffer[i, ] # 取得單個緩衝區
  
  for (poi_category in names(poi_types)) {
    values <- poi_types[[poi_category]]
    cat(paste0("正在搜尋 ", poi_category))
    
    # 使用緩衝區的邊界框進行查詢
    poi_data <- station_buffer %>%
      st_bbox() %>%
      opq(timeout = 300) %>%
      add_osm_feature(key = "amenity", value = values) %>%
      osmdata_sf()
    
    # 將點資料加入列表，並標註類型
    if (!is.null(poi_data$osm_points) && nrow(poi_data$osm_points) > 0) {
      all_poi_sf_list[[length(all_poi_sf_list) + 1]] <- poi_data$osm_points %>%
        mutate(poi_type = poi_category, geometry_type = "point")
      cat(paste0("  找到 ", nrow(poi_data$osm_points), " 個點狀 ", poi_category, " POI\n"))
    }
    
    # 將多邊形資料的質心加入列表，並標註類型
    if (!is.null(poi_data$osm_polygons) && nrow(poi_data$osm_polygons) > 0) {
      all_poi_sf_list[[length(all_poi_sf_list) + 1]] <- poi_data$osm_polygons %>%
        st_centroid() %>%
        mutate(poi_type = poi_category, geometry_type = "polygon_centroid")
      cat(paste0("  找到 ", nrow(poi_data$osm_polygons), " 個面狀 ", poi_category, " POI (使用質心)\n"))
    }
  }
}

# 將列表中的所有 sf 物件合併成一個 sf dataframe
all_poi_sf <- bind_rows(all_poi_sf_list)
mrt_poi_cleaned <- all_poi_sf %>% filter(!is.na(name))
print(paste0("原始 POI 資料列數：", nrow(all_poi_sf)))
print(paste0("清理後 POI 資料列數：", nrow(mrt_poi_cleaned)))
print(names(mrt_poi_cleaned))

# 空間篩選 POI
point_in_buffer <- mrt_poi_cleaned %>%
  st_filter(Addr_buffer, .predicate = st_within)
nrow(point_in_buffer)

# 獲取地址座標
address_coords <- st_coordinates(sf_geocoded)

# 將 POI 轉換為包含座標的資料框
poi_coords_df <- point_in_buffer %>%
  st_coordinates() %>%
  as.data.frame() %>%
  rename(poi_lon = X, poi_lat = Y)

# 將 POI 屬性與座標合併
poi_with_coords <- bind_cols(point_in_buffer, poi_coords_df)

# 創建包含地址座標的資料框
address_coords_df <- data.frame(addr_lon = address_coords[1], addr_lat = address_coords[2])


# 定義目標投影座標系統 (TWD97)
target_crs <- 3826

# 定義一個函數來計算兩點之間的公尺距離
calculate_distance_meters <- function(lon1, lat1, lon2, lat2) {
  point1 <- st_point(c(lon1, lat1))
  point2 <- st_point(c(lon2, lat2))
  sf_point1 <- st_sfc(point1, crs = 4326)
  sf_point2 <- st_sfc(point2, crs = 4326)
  sf_point1_proj <- st_transform(sf_point1, crs = target_crs)
  sf_point2_proj <- st_transform(sf_point2, crs = target_crs)
  return(st_distance(sf_point1_proj, sf_point2_proj, by_element = TRUE))
}

# 計算地址與每個 POI 之間的距離並創建線段 sf 物件 (在投影座標系統下)
lines_sf <- point_in_buffer %>%
  mutate(
    addr_lon = address_coords[1],
    addr_lat = address_coords[2]
  ) %>%
  rowwise() %>%
  mutate(
    poi_lon = st_coordinates(geometry)[1],
    poi_lat = st_coordinates(geometry)[2],
    distance_meters = calculate_distance_meters(addr_lon, addr_lat, poi_lon, poi_lat),
    distance = paste0(round(distance_meters, 2), " 公尺"), # 將數值和 " 公尺" 連接
    geometry = st_sfc(st_linestring(matrix(c(addr_lon, addr_lat, poi_lon, poi_lat), ncol = 2, byrow = TRUE)), crs = 4326)
  ) %>%
  ungroup() %>% # 移除 rowwise() 的影響
  select(name,distance_meters,distance,poi_type)
print(head(lines_sf))
print(names(lines_sf))
nrow(lines_sf)

#存檔
poi_geo <- 'C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/poi_geo_buffered.gpkg'
st_write(point_in_buffer, poi_geo , driver = 'GPKG', delete_layer = TRUE)

# 讀取 GeoJSON
mrt_poi <- st_read('C:/Users/folow/Desktop/大三下上課/20225創業競賽/創業R語言/ouput/poi_geo_buffered.gpkg')%>% 
  select(addr.city, name, addr.full, addr.district,poi_type,geometry_type)
print(head(mrt_poi))

# 獲取地址座標
address_coords <- st_coordinates(sf_geocoded)
mrt_poi <- mrt_poi %>%
  mutate(distance = lines_sf$distance)


mrt_point_food <- mrt_poi %>% filter(poi_type=="food")
mrt_point_health <- mrt_poi %>% filter(poi_type=="health" )
mrt_point_public <- mrt_poi %>% filter(poi_type=="public")


# 定義 POI 類別的顏色
poi_color <- c(
  "food" = "lightblue",
  "health" = "green",
  "public" = "orange"
)
# 在創建 lines_sf 後，新增 line_color 欄位
lines_sf <- lines_sf %>%
  mutate(
    line_color = case_when(
      poi_type == "food" ~poi_color["food"],
      poi_type == "health" ~ poi_color["health"],
      poi_type == "public" ~ poi_color["public"],
      TRUE ~ "gray" # 預設顏色，以防 poi_type 不在我們的映射中
    )
  ) %>% 
  mutate(line_color = unname(line_color))
lines_sf 


# 計算各類別 POI 的平均距離和家數
poi_summary <- lines_sf %>%
  group_by(poi_type) %>%
  summarise(
    平均距離 = paste0(round(mean(distance_meters, na.rm = TRUE), 2), " 公尺"),
    家數 = n()
  )

print(poi_summary)

# 創建 HTML 圖例內容
legend_html <- paste0(
  "<div style='padding: 10px; background-color: white; border: 1px solid black;'>",
  "<b>POI 類別分析</b><br>",
  paste0("<i style='background: #00A5CF; border-radius: 50%; width: 10px; height: 10px; display: inline-block; margin-right: 5px;'></i> 飲食：平均距離 ", poi_summary$平均距離[poi_summary$poi_type == 'food'], "，家數 ", poi_summary$家數[poi_summary$poi_type == 'food'], "<br>"),
  paste0("<i style='background: green; border-radius: 50%; width: 10px; height: 10px; display: inline-block; margin-right: 5px;'></i> 醫療：平均距離 ", poi_summary$平均距離[poi_summary$poi_type == 'health'], "，家數 ", poi_summary$家數[poi_summary$poi_type == 'health'], "<br>"),
  paste0("<i style='background: darkorange; border-radius: 50%; width: 10px; height: 10px; display: inline-block; margin-right: 5px;'></i> 公共設施：平均距離 ", poi_summary$平均距離[poi_summary$poi_type == 'public'], "，家數 ", poi_summary$家數[poi_summary$poi_type == 'public'], "<br>",
         "</div>"
  ))
# 創建 leaflet 地圖
leaflet() %>%
  setView(address_coords[1], address_coords[2], zoom = 15) %>%
  addProviderTiles("CartoDB.Positron") %>%
  addPolylines(
    data = lines_sf,
    color = ~line_color,
    weight = 2,
    opacity = 0.1,
    popup = ~paste0("距離: ", distance)) %>% 
  addMarkers(
    data = sf_geocoded,
    popup = ~paste("<br>Address:", addresses$address),
    options = markerOptions(opacity = 0.8)
  ) %>%
  # 只有當 mrt_point_food 有資料時才添加標籤
  {if(nrow(mrt_point_food) > 0) addCircleMarkers(
    map = .,
    data = mrt_point_food,
    popup = ~paste( "<br>營業地址:", addr.full,"<br>Name:",name,"<br>距離:",distance),
    label = ~name,
    options = markerOptions(opacity = 0.8),
    clusterOptions = markerClusterOptions(,showCoverageOnHover = FALSE),
    stroke = T,
    weight = 0.2,#邊框粗度
    opacity = 1,#整體透明度
    fill = TRUE,#要不要填色
    color = "black",#邊框顏色
    fillColor = "lightblue",#填充顏色
    fillOpacity = 1,
    radius = 3.5, #點點的大小
  ) else .} %>%
  # 只有當 mrt_point_health 有資料時才添加標籤
  {if(nrow(mrt_point_health) > 0) addCircleMarkers(
    map = .,
    data = mrt_point_health,
    popup = ~paste( "<br>營業地址:", addr.full,"<br>Name:",name,"<br>距離:",distance),
    label = ~name,
    options = markerOptions(opacity = 0.8),
    clusterOptions = markerClusterOptions(,showCoverageOnHover = FALSE),
    stroke = T,
    weight = 0.2,#邊框粗度
    opacity = 1,#整體透明度
    fill = TRUE,#要不要填色
    color = "black",#邊框顏色,
    fillColor = "lightgreen",#填充顏色
    fillOpacity = 1,
    radius = 3.5
  ) else .} %>%
  # 只有當 mrt_point_public 有資料時才添加標籤
  {if(nrow(mrt_point_public) > 0) addCircleMarkers(
    map = .,
    data = mrt_point_public,
    popup = ~paste( "<br>營業地址:", addr.full,"<br>Name:",name,"<br>距離:",distance),
    label = ~name,
    stroke = T,
    weight = 0.2,
    opacity = 1,
    fill = T,
    color = "black",#邊框顏色
    fillColor = "orange",
    fillOpacity = 1,
    radius = 3.5) else .} %>%
  addPolylines(
    data = multi_buffer_lines,
    label = ~paste0(環域範圍, " 公尺"),
    labelOptions = labelOptions(
      noHide = T,
      offset = c(0, 0),
      direction = 'auto', # 讓標籤自動調整方向
      style = list("color" = "black", "font-size" = "10px")),
    color = "black",
    weight = 0.5,
    opacity = 1) %>% 

  addControl(html = legend_html, position = "bottomleft")

