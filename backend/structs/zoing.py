from dataclasses import dataclass


@dataclass
class Zoning:
    zone: str  # 使用分區
    far: float  # 容積率
    bcr: float  # 建蔽率
    is_public_land: str  # 是否為公有土地(Y/N)
