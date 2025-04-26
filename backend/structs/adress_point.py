from dataclasses import dataclass


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
