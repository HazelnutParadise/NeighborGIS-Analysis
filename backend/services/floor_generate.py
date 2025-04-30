import math
import os
import io
import asyncio
import pandas as pd
import matplotlib
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Rectangle
from enum import Enum

matplotlib.use('Agg')  # 使用非互動式後端，適合異步環境


class ArrangementType(Enum):
    LEFT = "僅左側"
    RIGHT = "僅右側"
    TOP = "僅上側"
    BOTTOM = "僅下側"
    BOTH_LEFT_AND_RIGHT = "左右兩側"
    BOTH_TOP_AND_BOTTOM = "上下兩側"


UNIT_ASPECT_RATIO: float = 1.3


async def generate_floor(
        building_area_m2: float,
        total_units: int,
        public_ratio: float,
        balcony_depth: float,
        arrangement_type: ArrangementType,
        unit_spacing: float,
        m2_to_ping: float = 0.3025
) -> str:
    """
    產生建物平面圖並回傳 SVG 格式的字串。
    """

    await _init()

    # --- 根據輸入參數估算 ---
    public_area_m2: float = building_area_m2 * public_ratio
    net_unit_area_total: float = building_area_m2 * (1 - public_ratio)
    average_net_unit_area: float = net_unit_area_total / total_units
    average_unit_width: float = math.sqrt(
        average_net_unit_area * UNIT_ASPECT_RATIO
    )
    average_unit_height: float = average_net_unit_area / average_unit_width

    core_w, core_l = _calculate_core_dimensions(
        arrangement_type,
        average_unit_width,
        average_unit_height,
        total_units,
        public_area_m2,
        unit_spacing
    )

    bld_w, bld_l = _calculate_building_dimensions(
        arrangement_type,
        core_w, core_l,
        average_unit_width, average_unit_height,
        balcony_depth, total_units, unit_spacing
    )

    core_x0, core_y0 = _calculate_core_position(
        arrangement_type,
        bld_w, bld_l,
        core_w, core_l,
        unit_spacing
    )

    core_x1, core_y1 = core_x0 + core_w, core_y0 + core_l

    # --- 建立住戶單元佈局 DataFrame ---
    df = pd.DataFrame({"unit_number": range(1, total_units+1)})
    df["uw"], df["uh"] = average_unit_width, average_unit_height

    df["side"] = df.apply(
        lambda row:
        _get_side(row, arrangement_type=arrangement_type, total_units=total_units), axis=1)

    df[["xmin", "xmax", "ymin", "ymax"]] = df.apply(
        lambda row:
        _calc_coords(
            row, core_x0, core_y0, core_x1, core_y1,
            arrangement_type, unit_spacing, total_units
        ), axis=1, result_type="expand")

    df[["bx0", "bx1", "by0", "by1"]] = df.apply(
        lambda row:
        _calc_balcony(row, balcony_depth), axis=1, result_type="expand"
    )

    # --- 繪製平面圖 ---
    # 因繪圖操作可能耗時，使用異步執行
    return await _render_plot(
        df, core_x0, core_y0, core_w, core_l,
        min(df.xmin.min(), df.bx0.min()) - 1,
        max(df.xmax.max(), df.bx1.max()) + 1,
        min(df.ymin.min(), df.by0.min()) - 1,
        max(df.ymax.max(), df.by1.max()) + 1,
        arrangement_type
    )


async def _init() -> None:
    # 字型初始化可能涉及檔案讀取，適合異步處理
    # 1. 指定字型檔路徑
    font_path = os.path.join("fonts", "NotoSansTC-Regular.ttf")

    # 使用異步執行字型相關設定
    await asyncio.to_thread(lambda: _setup_font(font_path))


def _setup_font(font_path: str) -> None:
    """實際設置字型的輔助函數"""
    # 2. 把字型加入 Matplotlib font manager
    font_manager.fontManager.addfont(font_path)

    # 3. 從字型檔取出字型名稱
    prop = font_manager.FontProperties(fname=font_path)
    font_name = prop.get_name()

    # 4. 設成全域預設字型
    matplotlib.rcParams['font.family'] = 'sans-serif'
    matplotlib.rcParams['font.sans-serif'] = [font_name]
    matplotlib.rcParams['axes.unicode_minus'] = False


async def _render_plot(
        df: pd.DataFrame,
        core_x0: float,
        core_y0: float,
        core_w: float,
        core_l: float,
        xmin_b: float,
        xmax_b: float,
        ymin_b: float,
        ymax_b: float,
        arrangement_type: ArrangementType
) -> str:
    """異步繪製圖表並轉換為SVG"""
    # 使用 asyncio.to_thread 將繪圖操作放入執行緒池
    return await asyncio.to_thread(lambda: _create_plot(
        df, core_x0, core_y0, core_w, core_l, xmin_b, xmax_b, ymin_b, ymax_b, arrangement_type
    ))


def _create_plot(
        df: pd.DataFrame,
        core_x0: float,
        core_y0: float,
        core_w: float,
        core_l: float,
        xmin_b: float,
        xmax_b: float,
        ymin_b: float,
        ymax_b: float,
        arrangement_type: ArrangementType
) -> str:
    """建立圖表並輸出為SVG字串"""
    fig, ax = plt.subplots(figsize=(10, 8))  # 增加寬度以容納外部圖例
    plt.subplots_adjust(right=0.8)  # 縮小右邊界為圖例預留空間

    # 建物輪廓
    ax.add_patch(Rectangle(
        (xmin_b, ymin_b),
        xmax_b - xmin_b,
        ymax_b - ymin_b,
        fill=False, edgecolor='black', linewidth=1
    ))

    # 核心筒
    ax.add_patch(Rectangle(
        (core_x0, core_y0), core_w, core_l,
        facecolor='lightcoral', edgecolor='black'
    ))
    ax.text(
        core_x0+core_w/2, core_y0+core_l/2, "核心筒",
        ha='center', va='center'
    )

    # 住戶單元與標籤
    for _, row in df.iterrows():
        ax.add_patch(Rectangle(
            (row.xmin, row.ymin),
            row.uw, row.uh,
            facecolor='lightblue', edgecolor='black'
        ))
        ax.text(
            (row.xmin+row.xmax)/2, (row.ymin+row.ymax)/2,
            f"戶{int(row.unit_number)}",
            fontsize=8, ha='center', va='center'
        )

    # 陽台
    for _, row in df.iterrows():
        ax.add_patch(Rectangle(
            (row.bx0, row.by0),
            row.bx1-row.bx0, row.by1-row.by0,
            facecolor='lightgreen', edgecolor='black'
        ))

    # 新增圖例
    legend_elements = [
        Rectangle(
            (0, 0), 1, 1, facecolor='lightcoral',
            edgecolor='black', label='核心筒'
        ),
        Rectangle(
            (0, 0), 1, 1, facecolor='lightblue',
            edgecolor='black', label='住戶單元'
        ),
        Rectangle(
            (0, 0), 1, 1, facecolor='lightgreen',
            edgecolor='black', label='陽台'
        )
    ]
    ax.legend(
        handles=legend_elements,
        loc='center left',
        bbox_to_anchor=(1.05, 0.5),  # 將圖例放在圖表右側
        frameon=True,
        fancybox=True,
        shadow=True
    )

    # 明確設定顯示範圍
    ax.set_xlim(xmin_b, xmax_b)
    ax.set_ylim(ymin_b, ymax_b)

    ax.set_title(f"建物平面配置圖 (排列型態：{arrangement_type.value})")

    ax.set_xlabel("寬度 (公尺)")
    ax.set_ylabel("長度 (公尺)")
    ax.set_aspect('equal', 'box')

    # 將圖表輸出為 SVG 字串
    buffer = io.StringIO()
    plt.savefig(buffer, format='svg')
    buffer.seek(0)
    svg_content = buffer.getvalue()
    plt.close()  # 關閉圖表以釋放資源
    return svg_content


def _calculate_core_dimensions(
    arr: ArrangementType,
    u_w: float,
    u_h: float,
    n: int,
    pub_area: float,
    sp: float
) -> tuple[float, float]:
    """
    --- 計算核心筒尺寸 ---
    """
    core_area = pub_area
    width: float = 0
    length: float = 0
    match(arr):
        case ArrangementType.LEFT | ArrangementType.RIGHT:
            length = (u_h + sp) * n + sp
            width = max(u_w * 0.3, core_area/length)
        case ArrangementType.TOP | ArrangementType.BOTTOM:
            width = (u_w + sp) * n + sp
            length = max(u_h * 0.3, core_area/width)
        case ArrangementType.BOTH_LEFT_AND_RIGHT:
            # 處理單數戶數情況
            left_count = (n + 1) // 2  # 左側單位數（單數時左側多1）
            # 使用左側單位數來計算長度，確保足夠空間
            length = (u_h + sp) * left_count + sp
            width = max(u_w * 0.8, core_area/length)
        case ArrangementType.BOTH_TOP_AND_BOTTOM:
            # 處理單數戶數情況
            bottom_count = (n + 1) // 2  # 底部單位數（單數時底部多1）
            # 使用底部單位數來計算寬度，確保足夠空間
            width = (u_w + sp) * bottom_count + sp
            length = max(u_h * 0.8, core_area/width)
        case _:
            width = math.sqrt(core_area)
            length = math.sqrt(core_area)

    return width, length


def _calculate_building_dimensions(
    arr: ArrangementType,
    cw: float,
    cl: float,
    uw: float,
    uh: float,
    bd: float,
    n: int,
    sp: float
) -> tuple[float, float]:
    """
    --- 計算建物外框尺寸 ---
    """
    bw: float = 0
    bl: float = 0
    match (arr):
        case ArrangementType.LEFT | ArrangementType.RIGHT:
            bw = cw + uw + bd + 2*sp
            bl = cl + 2*sp
        case ArrangementType.TOP | ArrangementType.BOTTOM:
            bw = cw + 2*sp
            bl = cl + uh + bd + 2*sp
        case ArrangementType.BOTH_LEFT_AND_RIGHT:
            bw = cw + 2*(uw + bd + 2)
            bl = cl + 2*sp
        case ArrangementType.BOTH_TOP_AND_BOTTOM:
            bw = cw + 2*sp
            bl = cl + 2*(uh + bd + 2)
        case _:
            bw = cw + 10
            bl = cl + 10

    return bw, bl


def _calculate_core_position(
    arr: ArrangementType,
    bw: float,
    bl: float,
    cw: float,
    cl: float,
    sp: float
) -> tuple[float, float]:
    """
    --- 計算核心筒位置 ---
    """
    x0: float = 0
    y0: float = 0
    match (arr):
        case ArrangementType.LEFT:
            x0 = sp
        case ArrangementType.RIGHT:
            x0 = bw - cw - sp
        case _:
            x0 = (bw - cw) / 2
            y0 = (bl - cl - sp) if (
                arr == ArrangementType.TOP
            ) else sp if (
                arr == ArrangementType.BOTTOM
            ) else (bl - cl) / 2

    return x0, y0


def _get_side(
        row: pd.Series,
        arrangement_type: ArrangementType,
        total_units: int
) -> str:
    i = row.unit_number
    # 修改為考慮單數的情況下計算左右或上下兩側的界線
    # 對於奇數個單位，第一側會多一個單位
    left_count = (total_units + 1) // 2  # 使用整除，確保左側(或下側)優先多一個單位
    match (arrangement_type):
        case ArrangementType.BOTH_LEFT_AND_RIGHT:
            return "left" if i <= left_count else "right"
        case ArrangementType.BOTH_TOP_AND_BOTTOM:
            return "bottom" if i <= left_count else "top"
        case ArrangementType.LEFT:
            return "left"
        case ArrangementType.RIGHT:
            return "right"
        case ArrangementType.TOP:
            return "top"
        case ArrangementType.BOTTOM:
            return "bottom"
        case _:
            return "center"


def _calc_coords(
    row: pd.Series,
    core_x0: float,
    core_y0: float,
    core_x1: float,
    core_y1: float,
    arrangement_type: ArrangementType,
    unit_spacing: float,
    total_units: int
) -> pd.Series:
    i, sp, uw, uh = row.unit_number, unit_spacing, row.uw, row.uh
    x0 = y0 = 0

    # 計算每側應該有多少單位（處理奇數情況）
    left_count = (total_units + 1) // 2  # 第一側的單位數（奇數時多1）
    right_count = total_units - left_count  # 第二側的單位數

    if arrangement_type == ArrangementType.BOTH_TOP_AND_BOTTOM:
        if i <= left_count:
            # 底部單位（可能會比頂部多一個單位）
            idx = i - 1
            x0 = core_x0 + sp + idx*(uw+sp)
            y0 = core_y0 - uh - sp
        else:
            # 頂部單位
            idx = i - left_count - 1
            x0 = core_x0 + sp + idx*(uw+sp)
            y0 = core_y1 + sp

    elif row.side == "left":
        x0 = core_x0 - uw - sp
        if arrangement_type == ArrangementType.LEFT:
            idx = i - 1
        else:
            # 在BOTH_LEFT_AND_RIGHT情況下，計算左側索引
            idx = i - 1
        y0 = core_y0 + idx*(uh+sp) + sp

    elif row.side == "right":
        x0 = core_x1 + sp
        if arrangement_type == ArrangementType.RIGHT:
            idx = i - 1
        else:
            # 在BOTH_LEFT_AND_RIGHT情況下，計算右側索引
            idx = i - left_count - 1
        y0 = core_y0 + idx*(uh+sp) + sp

    elif row.side == "top":
        idx = i-1
        x0 = core_x0 + sp + idx*(uw+sp)
        y0 = core_y1 + sp

    elif row.side == "bottom":
        idx = i-1
        x0 = core_x0 + sp + idx*(uw+sp)
        y0 = core_y0 - uh - sp

    return pd.Series([x0, x0+uw, y0, y0+uh])


def _calc_balcony(
        row: pd.Series,
        balcony_depth: float
) -> tuple[float, float, float, float]:
    """
    --- 計算陽台座標 ---
    """
    _, uh = row.uw, row.uh
    x0, x1, y0, y1 = row.xmin, row.xmax, row.ymin, row.ymax
    d = balcony_depth
    side = row.side
    if side == "left":
        return x0-d, x0, y0+0.1*uh, y1-0.1*uh
    if side == "right":
        return x1, x1+d, y0+0.1*uh, y1-0.1*uh
    if side == "top":
        return x0, x1, y1, y1+d
    if side == "bottom":
        return x0, x1, y0-d, y0
    return (0, 0, 0, 0)


if __name__ == "__main__":
    # 測試用例

    async def test_generate_floor():
        svg = await generate_floor(
            building_area_m2=1000,
            total_units=10,
            public_ratio=0.2,
            balcony_depth=1.5,
            arrangement_type=ArrangementType.BOTH_TOP_AND_BOTTOM,
            unit_spacing=0.5
        )
        with open("floor_plan.svg", "w", encoding="utf-8") as f:
            f.write(svg)

    asyncio.run(test_generate_floor())
