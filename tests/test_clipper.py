import pytest
import sys
from unittest.mock import MagicMock

# Mock dependencies before importing clipper
sys.modules['dotenv'] = MagicMock()
sys.modules['mediapipe'] = MagicMock()
sys.modules['mediapipe.python'] = MagicMock()
sys.modules['mediapipe.python.solutions'] = MagicMock()
sys.modules['cv2'] = MagicMock()

from clipper import format_ass_time

@pytest.mark.parametrize("seconds, expected", [
    (0, "0:00:00.00"),
    (-1, "0:00:00.00"),
    (5.5, "0:00:05.50"),
    (65.29, "0:01:05.29"),
    (0.29, "0:00:00.29"),
    (3661, "1:01:01.00"),
    (0.99, "0:00:00.99"),
    (0.999, "0:00:01.00"),
    (59.999, "0:01:00.00"),
    (3599.999, "1:00:00.00"),
])
def test_format_ass_time(seconds, expected):
    assert format_ass_time(seconds) == expected
