"""
Algorithm 11: Deterministic File Categorization Engine.
Rule priority:
  1. College subject keywords in filename
  2. Project keywords in filename
  3. Extension-based file type
  4. Unsorted fallback
"""
from pathlib import Path
from typing import List, Optional, Tuple

DOCUMENTS_EXT = {
    ".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt", ".md",
    ".ppt", ".pptx", ".odp", ".xls", ".xlsx", ".ods", ".csv",
    ".pages", ".numbers", ".key", ".epub", ".mobi", ".tex"
}
IMAGES_EXT = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp",
    ".tiff", ".tif", ".ico", ".heic", ".heif", ".raw", ".dng",
    ".cr2", ".nef", ".arw", ".psd", ".xcf", ".ai", ".eps"
}
VIDEOS_EXT = {
    ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm",
    ".m4v", ".3gp", ".mpeg", ".mpg", ".ts", ".vob", ".ogv",
}
AUDIO_EXT = {
    ".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a",
    ".opus", ".aiff", ".mid", ".midi",
}
ARCHIVES_EXT = {
    ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz",
    ".cab", ".iso", ".lz", ".zst",
}
CODE_EXT = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp",
    ".h", ".hpp", ".cs", ".go", ".rs", ".rb", ".php", ".swift",
    ".kt", ".scala", ".sh", ".bat", ".ps1", ".sql", ".html",
    ".css", ".scss", ".json", ".yaml", ".yml", ".toml", ".xml",
    ".dart", ".vue", ".svelte", ".ipynb", ".lua",
}
INSTALLER_EXT = {".exe", ".msi", ".pkg", ".deb", ".rpm", ".appimage", ".apk", ".run", ".bin"}

DEFAULT_COLLEGE_KEYWORDS = [
    "dbms", "database", "cn", "computer_network", "computernetwork",
    "operating_system", "operatingsystem", "os_lab", "dsa",
    "data_structure", "datastructure", "algorithm", "java", "python",
    "oops", "oop", "math", "maths", "mathematics", "statistics",
    "physics", "chemistry", "biology", "assignment", "lab_manual",
    "labmanual", "practical", "notes", "lecture", "syllabus",
    "question_paper", "questionpaper", "sem", "semester",
]
DEFAULT_PROJECT_KEYWORDS: List[str] = []


def _stem_lower(name: str) -> str:
    return name.lower().replace("-", "_").replace(" ", "_")


def _check_keywords(stem: str, keywords: List[str]) -> Optional[str]:
    for kw in keywords:
        if kw.lower() in stem:
            return kw
    return None


def categorize_file(
    file_path: Path,
    college_keywords: Optional[List[str]] = None,
    project_keywords: Optional[List[str]] = None,
) -> Tuple[str, str]:
    """Return (category, reason) for a single file using deterministic rules."""
    col_kws = college_keywords if college_keywords is not None else DEFAULT_COLLEGE_KEYWORDS
    proj_kws = project_keywords if project_keywords is not None else DEFAULT_PROJECT_KEYWORDS
    ext = file_path.suffix.lower()
    stem = _stem_lower(file_path.stem)

    if col_kws:
        matched = _check_keywords(stem, col_kws)
        if matched:
            return "College", f"Filename matches college keyword '{matched}'"
    if proj_kws:
        matched = _check_keywords(stem, proj_kws)
        if matched:
            return "Projects", f"Filename matches project keyword '{matched}'"
    if ext in DOCUMENTS_EXT:
        return "Documents", f"Extension '{ext}' is a document format"
    if ext in IMAGES_EXT:
        return "Images", f"Extension '{ext}' is an image format"
    if ext in VIDEOS_EXT:
        return "Videos", f"Extension '{ext}' is a video format"
    if ext in AUDIO_EXT:
        return "Audio", f"Extension '{ext}' is an audio format"
    if ext in ARCHIVES_EXT:
        return "Archives", f"Extension '{ext}' is an archive format"
    if ext in CODE_EXT:
        return "Code", f"Extension '{ext}' is a source/code file"
    if ext in INSTALLER_EXT:
        return "Installers", f"Extension '{ext}' is an installer format"
    if ext:
        return "Unsorted", f"Extension '{ext}' has no matching category"
    return "Unsorted", "File has no extension — cannot determine category"
