"""
Face Processor — Dynamic face tracking with active speaker detection.

Upgrade 1: Gaussian smoothing for cinematic, momentum-based camera movement.
Upgrade 2: Active speaker detection via lip-openness scoring across multiple faces.
"""
import cv2
import numpy as np
try:
    from mediapipe.python.solutions import face_detection as mp_face_detection
except Exception:
    try:
        from mediapipe.solutions import face_detection as mp_face_detection
    except Exception:
        mp_face_detection = None
import os


class FaceTracker:
    def __init__(self):
        self._face_detection = None

    @property
    def face_detection(self):
        if mp_face_detection is None:
            return None
        if self._face_detection is None:
            self._face_detection = mp_face_detection.FaceDetection(
                model_selection=1,  # Full-range (within 5m)
                min_detection_confidence=0.5
            )
        return self._face_detection

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
        if mp_face_detection is None:
            return None

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

        # Calculate frame-accurate sample positions
        sample_interval = max(0.2, 1.0 / max(fps, 1))
        frame_num = int(start_time * fps)
        end_frame = int(end_time * fps)

        while frame_num <= end_frame:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            ret, frame = cap.read()
            if not ret:
                break

            # Validate actual frame position
            actual_pos = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            if actual_pos > end_time + sample_interval:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            detector = self.face_detection
            if detector is None:
                cap.release()
                return None
            results = detector.process(rgb_frame)

            center_x = self._pick_active_speaker_center(results, frame, src_w, src_h)

            raw_centers.append(center_x)
            timestamps.append(actual_pos if actual_pos > 0 else start_time + frame_num / fps)

            # Advance by sample_interval in frames
            frame_num += max(1, int(sample_interval * fps))

        cap.release()

        if not raw_centers:
            return None

        # --- Gaussian Smoothing (cinematic momentum) ---
        smoothed_centers = self._gaussian_smooth(raw_centers, sigma=2.0)

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

    def _pick_active_speaker_center(self, results, _frame, src_w, src_h) -> float:
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
        coordinate at each frame boundary, using linear interpolation
        between tracking keypoints for smooth, stepless motion.

        Format:  <timestamp> [OUT] crop x <value>;
        """
        lines = []
        coords = tracking['coords']
        timestamps = sorted(coords.keys())

        if not timestamps:
            return output_path

        start_t = min(timestamps)

        # Interpolate: emit commands at ~30 fps granularity between keypoints
        interp_interval = 1.0 / 30.0
        x_values = [coords[ts] for ts in timestamps]
        rel_times = [max(0.0, ts - start_t) for ts in timestamps]

        current_t = 0.0
        seg_idx = 0

        while seg_idx < len(rel_times) - 1 and current_t <= rel_times[-1]:
            t0, x0 = rel_times[seg_idx], x_values[seg_idx]
            t1, x1 = rel_times[seg_idx + 1], x_values[seg_idx + 1]

            while current_t <= t1:
                frac = (current_t - t0) / max(t1 - t0, 1e-6)
                frac = max(0.0, min(1.0, frac))
                # Ease-in-out quad for cinematic deceleration at keypoints
                eased = frac * frac * (3.0 - 2.0 * frac)
                interp_x = int(x0 + (x1 - x0) * eased)
                lines.append(f"{current_t:.3f} [OUT] crop x {interp_x};")
                current_t += interp_interval

            seg_idx += 1

        # Ensure final frame is covered
        if current_t <= rel_times[-1] + interp_interval:
            lines.append(f"{rel_times[-1]:.3f} [OUT] crop x {int(x_values[-1])};")

        cmd_content = "\n".join(lines)
        with open(output_path, 'w') as f:
            f.write(cmd_content)

        return output_path


tracker = FaceTracker()
