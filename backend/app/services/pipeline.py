import time
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

from app.models.file_node import FileNode
from app.models.scan_session import ScanSession, ScanReport
from app.models.duplicate_group import DuplicateGroup
from app.models.similar_image_group import SimilarImageCluster
from app.models.cleanup_recommendation import CleanupRecommendation
from app.services.scanner.scanner import Scanner
from app.services.scanner.tree_builder import TreeBuilder
from app.services.detection.duplicate_detector import DuplicateDetector
from app.services.detection.similar_image_detector import SimilarImageDetector
from app.services.analysis.file_analyzer import FileAnalyzer
from app.services.analysis.analytics_engine import AnalyticsEngine
from app.services.recommendation.recommendation_engine import RecommendationEngine
from app.services.snapshot.snapshot_manager import SnapshotManager
from app.database.repositories.scan_repository import ScanRepository

class ScanPipelineResult:
    def __init__(self, scan_id: str, root_path: str):
        self.scan_id = scan_id
        self.root_path = root_path
        self.status = "IN_PROGRESS"
        self.progress_percent = 0
        self.tree_root: Optional[FileNode] = None
        self.all_files: List[FileNode] = []
        self.all_directories: List[FileNode] = []
        self.duplicate_groups: List[DuplicateGroup] = []
        self.similar_clusters: List[SimilarImageCluster] = []
        self.old_files: List[Dict[str, Any]] = []
        self.temp_files: List[Dict[str, Any]] = []
        self.unified_metadata_files: List[Dict[str, Any]] = []
        self.recommendations: List[CleanupRecommendation] = []
        self.error_message: Optional[str] = None
        self.errors: List[Dict[str, Any]] = []

class ScanPipelineManager:
    """Orchestrates end-to-end ClutterScan analysis pipeline."""

    _instances: Dict[str, ScanPipelineResult] = {}
    _latest_scan_id: Optional[str] = None
    _lock = threading.Lock()

    @classmethod
    def get_result(cls, scan_id: str) -> Optional[ScanPipelineResult]:
        with cls._lock:
            return cls._instances.get(scan_id)

    @classmethod
    def get_latest_scan_id(cls) -> Optional[str]:
        with cls._lock:
            return cls._latest_scan_id

    @classmethod
    def start_pipeline(
        cls, scan_id: str, target_path: str, options: Dict[str, bool]
    ) -> ScanPipelineResult:
        result = ScanPipelineResult(scan_id, target_path)
        with cls._lock:
            cls._instances[scan_id] = result
            cls._latest_scan_id = scan_id

        # Run pipeline in a background thread to prevent blocking
        thread = threading.Thread(
            target=cls._run_pipeline,
            args=(result, options),
            daemon=True,
        )
        thread.start()
        return result

    @classmethod
    def _run_pipeline(cls, result: ScanPipelineResult, options: Dict[str, bool]):
        repo = ScanRepository()
        session = ScanSession(
            id=result.scan_id,
            root_path=result.root_path,
            start_time=datetime.now(),
            status="IN_PROGRESS",
            scan_options=options,
        )
        try:
            repo.create_session(session)
        except Exception:
            pass

        try:
            # 1. Algorithm 1 & 2: Scanner & Directory Size Aggregation
            result.progress_percent = 15
            scanner = Scanner(result.root_path)
            root_node = scanner.scan()
            result.tree_root = root_node
            result.errors = scanner.errors

            # Flatten files and directories
            files = TreeBuilder.collect_file_nodes(root_node)
            dirs = TreeBuilder.collect_directory_nodes(root_node)
            result.all_files = files
            result.all_directories = dirs
            result.progress_percent = 40

            # 2. Algorithm 3 & 4: Exact Duplicates & Resolution Preference
            if options.get("exactDupes", True):
                dup_detector = DuplicateDetector()
                result.duplicate_groups = dup_detector.find_duplicates(files)
            result.progress_percent = 60

            # 3. Algorithm 5: Similar Images (Perceptual Hashing)
            if options.get("similarImages", True):
                sim_detector = SimilarImageDetector()
                result.similar_clusters = sim_detector.find_similar_images(files)
            result.progress_percent = 75

            # 4. Algorithm 6: Old and Temporary Files
            analyzer = FileAnalyzer()
            old_files, temp_files = analyzer.detect_candidates(files)
            result.old_files = old_files
            result.temp_files = temp_files
            result.unified_metadata_files = analyzer.get_unified_metadata_items(files)
            result.progress_percent = 85

            # 5. Algorithm 9: Recommendation Scoring & Ranking
            rec_engine = RecommendationEngine()
            result.recommendations = rec_engine.generate_recommendations(
                files=files,
                duplicate_groups=result.duplicate_groups,
                old_files=old_files,
                temp_files=temp_files,
            )
            result.progress_percent = 92

            # 6. Algorithm 8 & 12: SQLite Persistence & Snapshot Creation
            dir_sizes = {d.path: d.aggregate_size for d in dirs}
            SnapshotManager.create_snapshot(
                scan_id=result.scan_id,
                root_path=result.root_path,
                total_inodes=len(files),
                directory_sizes=dir_sizes,
            )

            # Persist scan artifacts
            try:
                repo.save_files_and_directories(result.scan_id, files, dirs)
                repo.save_duplicate_groups(result.scan_id, result.duplicate_groups)
                repo.save_similar_image_clusters(result.scan_id, result.similar_clusters)
            except Exception:
                pass

            session.end_time = datetime.now()
            session.status = "COMPLETED"
            session.total_files = len(files)
            session.total_directories = len(dirs)
            session.total_size = root_node.aggregate_size
            session.error_count = len(scanner.errors)
            try:
                repo.update_session(session)
            except Exception:
                pass

            result.progress_percent = 100
            result.status = "COMPLETED"

        except Exception as e:
            result.status = "FAILED"
            result.error_message = str(e)
            session.end_time = datetime.now()
            session.status = "FAILED"
            try:
                repo.update_session(session)
            except Exception:
                pass
