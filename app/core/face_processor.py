"""
Face Processor — Dynamic face tracking with active speaker detection.

Upgrade 1: Gaussian smoothing for cinematic, momentum-based camera movement.
Upgrade 2: Active speaker detection via lip-openness scoring across multiple faces.
"""
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.python.solutions import face_detection as mp_face_detection
from app.config import TARGET_WIDTH, TARGET_HEIGHT
import os


class FaceTracker:
    def __init__(self):
        self.face_detection = mp_face_detection.FaceDetection(
            model_selection=1,  # Full-range (within 5m)
            min_detection_confidence=0.45
        )

    # ------------------------------------------------------------------
    # Upgrade 1: Dynamic crop with Gaussian smoothing (cinematic panning)
    # ------------------------------------------------------------------

    def get_dynamic_crop_coordinates(self, video_path, start_time, end_time,
                                     target_width=1080, target_height=1920):
        """
        Calculates smooth, dynamic crop coordinates using active speaker detection
        and Gaussian-weighted smoothing for cinematic camera movement.

        Returns a dict: {'crop_w', 'crop_h', 'coords': {timestamp: x_pixel}}
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        crop_w = int(src_h * (target_width / target_height))

        if crop_w >= src_w:
            cap.release()
            return None

        # Sample every 0.2 seconds
        sample_interval = 0.2
        current_t = start_time
        raw_centers = []
        timestamps = []

        while current_t <= end_time:
            cap.set(cv2.CAP_PROP_POS_MSEC, current_t * 1000)
            ret, frame = cap.read()
            if not ret:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.face_detection.process(rgb_frame)

            # Use active speaker detection if multiple faces found
            center_x = self._pick_active_speaker_center(results, frame, src_w, src_h)

            raw_centers.append(center_x)
            timestamps.append(current_t)
            current_t += sample_interval

        cap.release()

        if not raw_centers:
            return None

        # --- Gaussian Smoothing (cinematic momentum) ---
        smoothed_centers = self._gaussian_smooth(raw_centers, sigma=3.0)

        # Map back to timestamps
        coord_map = {}
        for i, center in enumerate(smoothed_centers):
            min_center = crop_w / 2
            max_center = src_w - (crop_w / 2)
            clamped = max(min_center, min(center, max_center))
            top_left_x = int(clamped - (crop_w / 2))
            coord_map[round(timestamps[i], 2)] = top_left_x

        return {
            'crop_w': crop_w,
            'crop_h': src_h,
            'coords': coord_map
        }

    # ------------------------------------------------------------------
    # Upgrade 2: Active speaker detection
    # ------------------------------------------------------------------

    def _pick_active_speaker_center(self, results, frame, src_w, src_h) -> float:
        """
        When multiple faces are detected, pick the active speaker using
        a lip-openness heuristic: the face with the tallest bounding box
        relative to its width is more likely to have an open mouth (speaking).

        Falls back to the largest face, then to the frame center.
        """
        if not results.detections:
            return src_w / 2

        if len(results.detections) == 1:
            bbox = results.detections[0].location_data.relative_bounding_box
            return (bbox.xmin + bbox.width / 2) * src_w

        # Score each face by (height / width) ratio — speaking = more vertical
        best_score = -1
        best_center_x = src_w / 2

        for det in results.detections:
            bbox = det.location_data.relative_bounding_box
            w = max(bbox.width, 1e-5)
            h = max(bbox.height, 1e-5)
            # Confidence × aspect ratio heuristic
            score = det.score[0] * (h / w)
            if score > best_score:
                best_score = score
                best_center_x = (bbox.xmin + w / 2) * src_w

        return best_center_x

    # ------------------------------------------------------------------
    # Gaussian smoothing helper
    # ------------------------------------------------------------------

    @staticmethod
    def _gaussian_smooth(values: list, sigma: float = 3.0) -> list:
        """
        Applies a 1D Gaussian kernel to smooth a list of values.
        Higher sigma = more smoothing / slower camera movement.
        """
        if len(values) < 3:
            return values

        arr = np.array(values, dtype=float)
        # Build kernel
        radius = int(3 * sigma)
        x = np.arange(-radius, radius + 1)
        kernel = np.exp(-0.5 * (x / sigma) ** 2)
        kernel /= kernel.sum()

        # Pad and convolve
        padded = np.pad(arr, radius, mode='edge')
        smoothed = np.convolve(padded, kernel, mode='valid')
        return smoothed.tolist()

    # ------------------------------------------------------------------
    # Generate FFmpeg sendcmd file for true dynamic panning
    # ------------------------------------------------------------------

    def generate_sendcmd_file(self, tracking: dict, output_path: str) -> str:
        """
        Writes an FFmpeg sendcmd script file that updates the crop X
        coordinate at each sampled timestamp, enabling true real-time
        camera panning in the rendered output.

        Format:  <timestamp> [OUT] crop x <value>;
        """
        lines = []
        coords = tracking['coords']
        timestamps = sorted(coords.keys())

        for i, ts in enumerate(timestamps):
            x = coords[ts]
            # FFmpeg sendcmd time is relative to clip start (0-based)
            lines.append(f"{ts:.2f} [OUT] crop x {x};")

        content = "\n".join(lines)
        with open(output_path, 'w') as f:
            f.write(content)

        return output_path


tracker = FaceTracker()
