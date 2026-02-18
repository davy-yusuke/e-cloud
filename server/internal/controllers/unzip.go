package controllers

import (
	"archive/zip"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"server/internal/models"
	"server/internal/repository"
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

type UnzipResponse struct {
	Message      string         `json:"message"`
	CreatedCount int            `json:"created_count"`
	CreatedNodes []*models.Node `json:"created_nodes"`
	CreatedPaths []string       `json:"created_paths"`
	RootParentID string         `json:"root_parent_id"`
	Timestamp    time.Time      `json:"timestamp"`
}

// @Summary Unzip uploaded ZIP archive
// @Tags files
// @Accept multipart/form-data
// @Produce json
// @Param parent_id formData string false "parent folder id"
// @Param file formData file true "zip file to upload"
// @Success 201 {object} controllers.UnzipResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security ApiKeyAuth
// @Router /files/unzip [post]
func UnzipHandler(fileRepo repository.FileRepository, storage *services.StorageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		const (
			maxZipSize          = int64(200 << 20)  // 200MB max upload zip
			maxEntries          = 5000              // cap on number of entries
			maxTotalExtractSize = int64(1024 << 20) // 1GB total extracted size
			maxFilenameLength   = 255
			tempPrefix          = "upload-zip-"
		)

		originalParentID := c.PostForm("parent_id")
		parentID := originalParentID
		uid, _ := c.Get("user_id")
		ownerID := uid.(string)

		type storageFromReader interface {
			SaveFromReader(ownerID string, path string, r io.Reader) (savedPath string, size int64, err error)
		}
		sw, ok := interface{}(storage).(storageFromReader)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "storage service must implement SaveFromReader(ownerID, path string, r io.Reader) (string, int64, error)"})
			return
		}

		fh, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
			return
		}

		src, err := fh.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open uploaded file"})
			return
		}
		defer src.Close()

		tmpFile, err := os.CreateTemp("", tempPrefix+"*.zip")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create temp file"})
			return
		}
		tmpPath := tmpFile.Name()
		defer func() {
			tmpFile.Close()
			_ = os.Remove(tmpPath)
		}()

		written, err := io.CopyN(tmpFile, src, maxZipSize+1)
		if err != nil && !errors.Is(err, io.EOF) {
			if !errors.Is(err, io.EOF) {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read uploaded file"})
				return
			}
		}
		if written > maxZipSize {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("zip too large (limit %d bytes)", maxZipSize)})
			return
		}
		stat, err := tmpFile.Stat()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to stat temp file"})
			return
		}
		if stat.Size() == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "empty zip"})
			return
		}

		zr, err := zip.OpenReader(tmpPath)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid zip archive"})
			return
		}
		defer zr.Close()

		createdNodes := make([]*models.Node, 0, 64)
		createdPaths := make([]string, 0, 64)
		dirNodeMap := map[string]string{}

		totalEntries := 0
		var totalExtractedSize int64 = 0

		baseName := strings.TrimSuffix(fh.Filename, filepath.Ext(fh.Filename))
		baseName = strings.ReplaceAll(baseName, "/", "_")
		baseName = strings.ReplaceAll(baseName, "\\", "_")
		if baseName == "" {
			baseName = "unzipped"
		}
		if len(baseName) > 200 {
			baseName = baseName[:200]
		}
		rootFolderName := fmt.Sprintf("%s_%d", baseName, time.Now().Unix())
		rootNode := &models.Node{
			OwnerID:  ownerID,
			ParentID: originalParentID,
			Name:     rootFolderName,
			Type:     "folder",
		}
		if err := fileRepo.CreateNode(rootNode); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create root folder node: " + err.Error()})
			return
		}
		createdNodes = append(createdNodes, rootNode)
		parentID = rootNode.ID
		physicalFolderPrefix := rootNode.ID

		createDirNode := func(dirParts []string) (string, error) {
			if len(dirParts) == 0 {
				return parentID, nil
			}
			var curPathParts []string
			var curParent = parentID
			for i, p := range dirParts {
				curPathParts = append(curPathParts, p)
				key := strings.Join(curPathParts, "/")
				if id, ok := dirNodeMap[key]; ok {
					curParent = id
					continue
				}
				node := &models.Node{
					OwnerID:  ownerID,
					ParentID: curParent,
					Name:     p,
					Type:     "folder",
				}
				if err := fileRepo.CreateNode(node); err != nil {
					return "", err
				}
				createdNodes = append(createdNodes, node)
				dirNodeMap[key] = node.ID
				curParent = node.ID
				if i > 1000 {
					return "", fmt.Errorf("too deep path")
				}
			}
			return curParent, nil
		}

		for _, f := range zr.File {
			totalEntries++
			if totalEntries > maxEntries {
				cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
				c.JSON(http.StatusBadRequest, gin.H{"error": "too many entries in zip"})
				return
			}

			name := f.Name
			if name == "" {
				continue
			}
			name = strings.ReplaceAll(name, "\\", "/")
			name = strings.TrimLeft(name, "/")

			clean := filepath.Clean(name)
			clean = strings.ReplaceAll(clean, "\\", "/")
			if clean == "." || clean == "" {
				continue
			}
			for _, pseg := range strings.Split(clean, "/") {
				if pseg == ".." {
					cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
					c.JSON(http.StatusBadRequest, gin.H{"error": "zip contains invalid path segments"})
					return
				}
			}

			if len(clean) > 4096 {
				cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
				c.JSON(http.StatusBadRequest, gin.H{"error": "filename too long"})
				return
			}

			if f.FileInfo().IsDir() || strings.HasSuffix(name, "/") {
				parts := strings.Split(strings.TrimRight(clean, "/"), "/")
				if _, err := createDirNode(parts); err != nil {
					cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create folder nodes: " + err.Error()})
					return
				}
				continue
			}

			if f.Mode()&os.ModeSymlink != 0 {
				continue
			}

			parts := strings.Split(clean, "/")
			for _, comp := range parts {
				if comp == "" {
					cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
					c.JSON(http.StatusBadRequest, gin.H{"error": "invalid path in zip"})
					return
				}
				if len(comp) > maxFilenameLength {
					cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
					c.JSON(http.StatusBadRequest, gin.H{"error": "filename component too long"})
					return
				}
			}

			dirParts := parts[:len(parts)-1]
			parentForFile, err := createDirNode(dirParts)
			if err != nil {
				cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create parent folders: " + err.Error()})
				return
			}

			rc, err := f.Open()
			if err != nil {
				cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read zip entry"})
				return
			}

			limited := io.LimitReader(rc, maxTotalExtractSize+1)
			relPath := path.Join(physicalFolderPrefix, clean)
			savedPath, size, err := sw.SaveFromReader(ownerID, relPath, limited)
			rc.Close()
			if err != nil {
				cleanupCreated(storage, createdPaths, createdNodes, fileRepo)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save extracted file: " + err.Error()})
				return
			}

			totalExtractedSize += size
			if totalExtractedSize > maxTotalExtractSize {
				_ = storage.DeleteFile(savedPath)
				cleanupCreated(storage, append(createdPaths, savedPath), createdNodes, fileRepo)
				c.JSON(http.StatusBadRequest, gin.H{"error": "zip extracts to too much data"})
				return
			}

			var mimeType string
			if f2, err := os.Open(savedPath); err == nil {
				buf := make([]byte, 512)
				n, _ := f2.Read(buf)
				mimeType = http.DetectContentType(buf[:n])
				f2.Close()
			}
			if mimeType == "" || mimeType == "application/octet-stream" {
				ext := strings.ToLower(filepath.Ext(parts[len(parts)-1]))
				if ext != "" {
					if byExt := mime.TypeByExtension(ext); byExt != "" {
						mimeType = byExt
					}
				}
			}
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}
			node := &models.Node{
				OwnerID:  ownerID,
				ParentID: parentForFile,
				Name:     parts[len(parts)-1],
				Type:     "file",
				Size:     size,
				Path:     savedPath,
				Mime:     mimeType,
			}
			if err := fileRepo.CreateNode(node); err != nil {
				_ = storage.DeleteFile(savedPath)
				cleanupCreated(storage, append(createdPaths, savedPath), createdNodes, fileRepo)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create node: " + err.Error()})
				return
			}
			createdNodes = append(createdNodes, node)
			createdPaths = append(createdPaths, savedPath)
		}

		resp := UnzipResponse{
			Message:      "unzipped successfully",
			CreatedCount: len(createdNodes),
			CreatedNodes: createdNodes,
			CreatedPaths: createdPaths,
			RootParentID: rootNode.ID,
			Timestamp:    time.Now().UTC(),
		}
		c.JSON(http.StatusCreated, resp)
	}
}

func cleanupCreated(storage *services.StorageService, savedPaths []string, createdNodes []*models.Node, fileRepo repository.FileRepository) {
	for _, p := range savedPaths {
		_ = storage.DeleteFile(p)
	}
	for i := len(createdNodes) - 1; i >= 0; i-- {
		_ = fileRepo.DeleteNode(createdNodes[i].ID)
	}
}
