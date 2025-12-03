package services

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

type StorageService struct {
	BasePath string
	MaxSize  int64
}

func NewStorageService(basePath string, maxSize int64) *StorageService {
	return &StorageService{BasePath: basePath, MaxSize: maxSize}
}

func sanitizeFileName(name string) string {
	name = filepath.Base(name)
	name = strings.TrimSpace(name)
	if name == "" {
		name = "file"
	}
	return name
}

func (s *StorageService) SaveFromReader(ownerID string, relPath string, r io.Reader) (string, int64, error) {
	if s == nil {
		return "", 0, fmt.Errorf("storage not configured")
	}
	if s.BasePath == "" {
		return "", 0, fmt.Errorf("storage base path not set")
	}
	relPath = filepath.ToSlash(relPath)
	relPath = strings.TrimLeft(relPath, "/")
	relPath = path.Clean("/" + relPath)
	relPath = strings.TrimLeft(relPath, "/")
	if relPath == "" {
		return "", 0, fmt.Errorf("empty relative path")
	}
	for _, seg := range strings.Split(relPath, "/") {
		if seg == ".." {
			return "", 0, fmt.Errorf("invalid path segment")
		}
	}

	destRel := filepath.FromSlash(relPath)
	destPath := filepath.Join(s.BasePath, "owners", ownerID, destRel)

	absBase, err := filepath.Abs(s.BasePath)
	if err != nil {
		return "", 0, fmt.Errorf("internal error: %w", err)
	}
	absDest, err := filepath.Abs(destPath)
	if err != nil {
		return "", 0, fmt.Errorf("internal error: %w", err)
	}
	if absDest != absBase && !strings.HasPrefix(absDest, absBase+string(os.PathSeparator)) {
		return "", 0, fmt.Errorf("invalid destination path")
	}

	if err := os.MkdirAll(filepath.Dir(absDest), 0o755); err != nil {
		return "", 0, fmt.Errorf("failed to create directories: %w", err)
	}

	tmp, err := os.CreateTemp("", "save-from-reader-*")
	if err != nil {
		return "", 0, fmt.Errorf("failed to create temp file: %w", err)
	}
	tmpPath := tmp.Name()
	defer func() {
		tmp.Close()
		_ = os.Remove(tmpPath)
	}()

	var reader io.Reader = r
	if s.MaxSize > 0 {
		reader = io.LimitReader(r, s.MaxSize+1)
	}

	n, err := io.Copy(tmp, reader)
	if err != nil {
		return "", 0, fmt.Errorf("failed to write temp file: %w", err)
	}
	if s.MaxSize > 0 && n > s.MaxSize {
		return "", 0, fmt.Errorf("file too large (max %d bytes)", s.MaxSize)
	}
	if err := tmp.Close(); err != nil {
		return "", 0, fmt.Errorf("failed to finalize temp file: %w", err)
	}

	if err := os.Rename(tmpPath, absDest); err != nil {
		in, err2 := os.Open(tmpPath)
		if err2 != nil {
			return "", 0, fmt.Errorf("failed to move temp file: %w", err)
		}
		defer in.Close()
		out, err2 := os.Create(absDest)
		if err2 != nil {
			return "", 0, fmt.Errorf("failed to create destination file: %w", err2)
		}
		defer out.Close()
		if _, err2 = io.Copy(out, in); err2 != nil {
			return "", 0, fmt.Errorf("failed to copy to destination: %w", err2)
		}
		_ = os.Remove(tmpPath)
	}

	return absDest, n, nil
}

func (s *StorageService) SaveFile(ownerID string, fileHeader *multipart.FileHeader) (string, int64, error) {
	if fileHeader.Size > s.MaxSize && s.MaxSize > 0 {
		return "", 0, errors.New("file too large")
	}
	src, err := fileHeader.Open()
	if err != nil {
		return "", 0, err
	}
	defer src.Close()

	dir := filepath.Join(s.BasePath, ownerID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", 0, err
	}

	safeName := sanitizeFileName(fileHeader.Filename)
	ts := time.Now().UnixNano()
	storedName := filepath.Join(dir, fmt.Sprintf("%d_%s", ts, safeName))

	dst, err := os.Create(storedName)
	if err != nil {
		return "", 0, err
	}
	defer dst.Close()

	written, err := io.Copy(dst, src)
	if err != nil {
		return "", 0, err
	}
	return storedName, written, nil
}

func (s *StorageService) DeleteFile(path string) error {
	return os.Remove(path)
}
