class ClutterScanException(Exception):
    """Base exception for ClutterScan."""
    pass

class PathNotFoundError(ClutterScanException):
    """Raised when the specified directory path does not exist."""
    pass

class PermissionDeniedError(ClutterScanException):
    """Raised when access permissions are insufficient."""
    pass

class ScanError(ClutterScanException):
    """Raised when an error occurs during directory scanning."""
    pass

class CleanupValidationError(ClutterScanException):
    """Raised when cleanup safety validation fails."""
    pass

class RecoveryError(ClutterScanException):
    """Raised when file recovery fails."""
    pass
