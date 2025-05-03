from dataclasses import dataclass
from typing import Optional
from structs.zoing import Zoning


@dataclass
class Coordinates:
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
    coordinates: Coordinates
    zoning: Optional[Zoning] = None
