from pathlib import Path
from PIL import Image, ImageDraw
from app.models.file_node import FileNode
from app.services.detection.similar_image_detector import SimilarImageDetector

def test_similar_image_detection(tmp_path: Path):
    """
    Test Algorithm 5:
    - Similar images (Hamming distance <= threshold) grouped into cluster
    - Unrelated image separated
    """
    # 1. Base image: black square with a white circle in the middle
    base_img = Image.new("L", (200, 200), color=0)
    draw = ImageDraw.Draw(base_img)
    draw.ellipse((50, 50, 150, 150), fill=255)
    
    base_path = tmp_path / "circle_base.png"
    base_img.save(base_path)

    # 2. Derivative image: same circle, slightly downscaled to (100, 100)
    deriv_img = base_img.resize((100, 100))
    deriv_path = tmp_path / "circle_small.png"
    deriv_img.save(deriv_path)

    # 3. Unrelated image: vertical bars pattern
    unrelated_img = Image.new("L", (200, 200), color=255)
    draw_u = ImageDraw.Draw(unrelated_img)
    for x in range(0, 200, 20):
        draw_u.rectangle((x, 0, x + 10, 200), fill=0)
    unrelated_path = tmp_path / "bars_unrelated.png"
    unrelated_img.save(unrelated_path)

    nodes = [
        FileNode(id="n1", name="circle_base.png", path=str(base_path), size=base_path.stat().st_size),
        FileNode(id="n2", name="circle_small.png", path=str(deriv_path), size=deriv_path.stat().st_size),
        FileNode(id="n3", name="bars_unrelated.png", path=str(unrelated_path), size=unrelated_path.stat().st_size),
    ]

    detector = SimilarImageDetector(threshold=10)
    clusters = detector.find_similar_images(nodes)

    assert len(clusters) == 1
    cluster = clusters[0]
    assert cluster.match_count == 2
    paths = [img.path for img in cluster.images]
    assert str(base_path) in paths
    assert str(deriv_path) in paths
    assert str(unrelated_path) not in paths

    # Base image with higher resolution should be reference
    assert cluster.images[0].is_reference is True
    assert cluster.images[0].path == str(base_path)
