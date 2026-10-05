from pathlib import Path
from typing import List, Dict, Set
from collections import defaultdict

from app.models.file_node import FileNode
from app.models.similar_image_group import SimilarImageCluster, PerceptualImageItem
from app.utils.image_utils import is_supported_image, get_image_resolution, compute_perceptual_hash
from app.utils.hashing import hamming_distance
from app.core.config import settings

class SimilarImageDetector:
    """Algorithm 5: Perceptual Hashing and Visual Similarity Detection."""

    def __init__(self, threshold: int = settings.DEFAULT_SIMILARITY_THRESHOLD):
        self.threshold = threshold

    def find_similar_images(self, files: List[FileNode]) -> List[SimilarImageCluster]:
        """
        Extract supported images, compute 64-bit DCT pHash,
        and group visually similar images within Hamming distance threshold.
        """
        image_files = [f for f in files if is_supported_image(Path(f.path))]
        if len(image_files) < 2:
            return []

        # Step 1: Compute pHash and dimensions for each image
        analyzed_images: List[Dict] = []
        for f in image_files:
            p = Path(f.path)
            phash = compute_perceptual_hash(p)
            if not phash:
                continue
            res = get_image_resolution(p)
            width, height = res if res else (0, 0)
            analyzed_images.append({
                "node": f,
                "path": str(p),
                "filename": f.name,
                "phash": phash,
                "width": width,
                "height": height,
                "pixel_count": width * height,
            })

        if len(analyzed_images) < 2:
            return []

        # Step 2: Pairwise Hamming distance comparison
        adj: Dict[int, Set[int]] = defaultdict(set)
        pair_distances: Dict[tuple, int] = {}

        n = len(analyzed_images)
        for i in range(n):
            for j in range(i + 1, n):
                h1 = analyzed_images[i]["phash"]
                h2 = analyzed_images[j]["phash"]
                dist = hamming_distance(h1, h2)
                if dist <= self.threshold:
                    adj[i].add(j)
                    adj[j].add(i)
                    pair_distances[(i, j)] = dist
                    pair_distances[(j, i)] = dist

        # Step 3: Connected components clustering
        visited: Set[int] = set()
        clusters: List[SimilarImageCluster] = []
        cluster_idx = 1

        for i in range(n):
            if i in visited or i not in adj:
                continue

            # BFS / DFS to collect connected component
            component = []
            queue = [i]
            visited.add(i)

            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            if len(component) < 2:
                continue

            # Pick reference image: highest resolution in component
            component.sort(key=lambda idx: analyzed_images[idx]["pixel_count"], reverse=True)
            ref_idx = component[0]
            ref_data = analyzed_images[ref_idx]

            cluster_items: List[PerceptualImageItem] = []
            
            # Reference image
            ref_item = PerceptualImageItem(
                id=f"img-c{cluster_idx}-1",
                sector_label="[SECTOR_01 // BASE]",
                badge="REFERENCE",
                is_reference=True,
                filename=ref_data["filename"],
                dimensions=f"{ref_data['width']} \u00d7 {ref_data['height']}",
                hamming_distance=0,
                similarity="100.0%",
                path=ref_data["path"],
                p_hash=ref_data["phash"],
                overlay_type="[RAW_SENSOR_MASTER]",
                overlay_detail="64-BIT DCT PROCESSED // REFERENCE BASE",
            )
            cluster_items.append(ref_item)

            # Candidate images
            for c_pos, member_idx in enumerate(component[1:], start=2):
                m_data = analyzed_images[member_idx]
                h_dist = pair_distances.get((ref_idx, member_idx), hamming_distance(ref_data["phash"], m_data["phash"]))
                sim_pct = max(0.0, (1.0 - (h_dist / 64.0)) * 100.0)

                overlay_type = "[PERCEPTUAL_DERIVATIVE]"
                overlay_detail = f"HAMMING DELTA: {h_dist} BITS"
                if m_data["pixel_count"] < ref_data["pixel_count"]:
                    overlay_type = "[DOWNSCALE_REPLICA]"
                    overlay_detail = f"RESOLUTION LOSS: {m_data['width']}x{m_data['height']}"

                c_item = PerceptualImageItem(
                    id=f"img-c{cluster_idx}-{c_pos}",
                    sector_label=f"[SECTOR_{c_pos:02d} // CANDIDATE]",
                    badge=f"DELTA_{h_dist:02d}",
                    is_reference=False,
                    filename=m_data["filename"],
                    dimensions=f"{m_data['width']} \u00d7 {m_data['height']}",
                    hamming_distance=h_dist,
                    similarity=f"{sim_pct:.1f}%",
                    path=m_data["path"],
                    p_hash=m_data["phash"],
                    overlay_type=overlay_type,
                    overlay_detail=overlay_detail,
                )
                cluster_items.append(c_item)

            cluster = SimilarImageCluster(
                id=f"group-{cluster_idx}",
                label=f"[GROUP_{cluster_idx:03d}] - {len(cluster_items)} MATCHES",
                match_count=len(cluster_items),
                images=cluster_items,
            )
            clusters.append(cluster)
            cluster_idx += 1

        return clusters
