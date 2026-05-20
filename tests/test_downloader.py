import unittest
from unittest.mock import patch
from app.core.downloader import get_video_info_url, is_valid_url

class TestDownloader(unittest.TestCase):
    @patch('yt_dlp.YoutubeDL')
    def test_get_video_info_url_exception(self, mock_ytdl):
        # Setup mock to raise an exception when extract_info is called
        mock_instance = mock_ytdl.return_value.__enter__.return_value
        mock_instance.extract_info.side_effect = Exception("Mocked download error")

        result = get_video_info_url("https://www.youtube.com/watch?v=invalid")

        self.assertEqual(result, {'title': 'Unknown', 'duration': 0})

if __name__ == '__main__':
    unittest.main()


def test_is_valid_url_valid_youtube():
    assert is_valid_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert is_valid_url("http://youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert is_valid_url("https://youtu.be/dQw4w9WgXcQ") is True


def test_is_valid_url_valid_supported_sites():
    assert is_valid_url("https://www.twitch.tv/ninja") is True
    assert is_valid_url("https://vimeo.com/123456789") is True
    assert is_valid_url("https://www.dailymotion.com/video/x80lpx") is True
    assert is_valid_url("https://facebook.com/username/videos/123456789/") is True
    assert is_valid_url("https://twitter.com/username/status/123456789") is True
    assert is_valid_url("https://www.x.com/username/status/123456789") is True


def test_is_valid_url_valid_direct_files():
    assert is_valid_url("https://example.com/video.mp4") is True
    assert is_valid_url("http://example.com/video.mkv") is True
    assert is_valid_url("https://example.com/video.mov") is True
    assert is_valid_url("https://example.com/video.avi") is True
    assert is_valid_url("https://example.com/video.webm") is True


def test_is_valid_url_invalid_urls():
    assert is_valid_url("https://example.com/video.txt") is False
    assert is_valid_url("https://example.com/image.jpg") is False
    assert is_valid_url("not_a_url") is False
    assert is_valid_url("") is False
    assert is_valid_url("ftp://example.com/video.mp4") is False
    assert is_valid_url("https://youtube.com/user/channel") is False
    assert is_valid_url("https://google.com") is False
