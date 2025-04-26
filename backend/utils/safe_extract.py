import math
import numpy as np


def safe_extract(val):
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    if isinstance(val, np.floating) and np.isnan(val):
        return None
    return val
