from dataclasses import dataclass


@dataclass
class APIResponse:
    message: str = None
    data: any = None
