from dataclasses import dataclass
from typing import Optional
from structs.zoing import Zoning


@dataclass
class Coordinate:
    """
    Class representing coordinates with latitude and longitude.
    """
    lat: float
    lng: float


@dataclass
class AddressPoint:
    """
    Class representing an address point with latitude and longitude.
    """
    address: str
    coordinate: Coordinate
    zoning: Optional[Zoning] = None
