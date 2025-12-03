package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"server/internal/models"
	"server/internal/repository"
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

// Add routes in main.go like:
// r := gin.Default()
// authMiddleware := middleware.AuthMiddleware()
// r.POST("/folders", authMiddleware, controllers.CreateFolderHandler(fileRepo))
// r.GET("/files", authMiddleware, controllers.ListHandler(fileRepo))
// r.POST("/files/upload", authMiddleware, controllers.UploadHandler(fileRepo, storageSvc))
// r.GET("/files/:id/download", authMiddleware, controllers.DownloadHandler(fileRepo))
// r.DELETE("/files/:id", authMiddleware, controllers.DeleteHandler(fileRepo, storageSvc))
// r.GET("/folders/:parent_id/stats", authMiddleware, controllers.FolderStatsHandler(fileRepo))
// r.PATCH("/files/:id/move", authMiddleware, controllers.MoveHandler(fileRepo)) // <- 追加例

type createFolderReq struct {
	Name     string `json:"name" binding:"required"`
	ParentID string `json:"parent_id,omitempty"`
}

type moveReq struct {
	ParentID string `json:"parent_id"`
}

type FolderStat struct {
	Type    string  `json:"type"`
	Count   int     `json:"count"`
	Percent float64 `json:"percent"`
}

type FolderStatsResponse struct {
	ParentID   string       `json:"parent_id"`
	TotalItems int          `json:"total_items"`
	Stats      []FolderStat `json:"stats"`
}

// @Summary Create folder
// @Tags files
// @Accept json
// @Produce json
// @Param payload body createFolderReq true "name and optional parent"
// @Success 201 {object} models.Node
// @Failure 400 {object} map[string]string
// @Security ApiKeyAuth
// @Router /folders [post]
func CreateFolderHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req createFolderReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		uid, _ := c.Get("user_id")
		ownerID := uid.(string)
		node := &models.Node{
			OwnerID:  ownerID,
			ParentID: req.ParentID,
			Name:     req.Name,
			Type:     "folder",
		}
		if err := fileRepo.CreateNode(node); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, node)
	}
}

// @Summary List files/folders
// @Tags files
// @Produce json
// @Param parent_id query string false "parent id (optional)"
// @Success 200 {array} models.Node
// @Security ApiKeyAuth
// @Router /files [get]
func ListHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		parentID := c.Query("parent_id")
		uid, _ := c.Get("user_id")
		ownerID := uid.(string)
		nodes, err := fileRepo.ListChildren(ownerID, parentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, nodes)
	}
}

// @Summary List files/folders under a folder
// @Tags files
// @Produce json
// @Param parent_id path string true "parent folder id"
// @Success 200 {array} models.Node
// @Security ApiKeyAuth
// @Router /folders/{parent_id} [get]
func FoldersListHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		parentID := c.Param("parent_id")

		uid, _ := c.Get("user_id")
		ownerID := uid.(string)

		fmt.Println("ListChildren", parentID)

		nodes, err := fileRepo.ListChildren(ownerID, parentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, nodes)
	}
}

// Upload
// @Summary Upload file
// @Tags files
// @Accept multipart/form-data
// @Produce json
// @Param parent_id formData string false "parent folder id"
// @Param file formData file true "file to upload"
// @Success 201 {object} models.Node
// @Security ApiKeyAuth
// @Router /files/upload [post]
func UploadHandler(fileRepo repository.FileRepository, storage *services.StorageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		parentID := c.PostForm("parent_id")
		uid, _ := c.Get("user_id")
		ownerID := uid.(string)

		fh, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file required"})
			return
		}
		savedPath, size, err := storage.SaveFile(ownerID, fh)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		node := &models.Node{
			OwnerID:  ownerID,
			ParentID: parentID,
			Name:     fh.Filename,
			Type:     "file",
			Size:     size,
			Path:     savedPath,
			Mime:     fh.Header.Get("Content-Type"),
		}
		if err := fileRepo.CreateNode(node); err != nil {
			_ = storage.DeleteFile(savedPath)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, node)
	}
}

// @Summary Download file
// @Tags files
// @Produce octet-stream
// @Param id path string true "file id"
// @Success 200 {file} file
// @Security ApiKeyAuth
// @Router /files/{id}/download [get]
func DownloadHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, _ := c.Get("user_id")
		ownerID := uid.(string)
		node, err := fileRepo.FindNodeByID(id)
		if err != nil || node == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if node.OwnerID != ownerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		if node.Type != "file" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "not a file"})
			return
		}
		if _, err := os.Stat(node.Path); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "file missing on server"})
			return
		}
		c.Header("Content-Disposition", "attachment; filename="+filepath.Base(node.Name))
		c.File(node.Path)
	}
}

// @Summary Delete node (file or folder)
// @Tags files
// @Param id path string true "node id"
// @Success 204
// @Security ApiKeyAuth
// @Router /files/{id} [delete]
func DeleteHandler(fileRepo repository.FileRepository, storage *services.StorageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		uid, _ := c.Get("user_id")
		ownerID := uid.(string)
		node, err := fileRepo.FindNodeByID(id)
		if err != nil || node == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if node.OwnerID != ownerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		if node.Type == "folder" {
			children, _ := fileRepo.ListChildren(ownerID, id)
			for _, ch := range children {
				if ch.Type == "file" {
					_ = storage.DeleteFile(ch.Path)
				} else {
					_ = DeleteRecursive(fileRepo, storage, ch)
				}
				_ = fileRepo.DeleteNode(ch.ID)
			}
		} else if node.Type == "file" {
			_ = storage.DeleteFile(node.Path)
		}
		_ = fileRepo.DeleteNode(id)
		c.Status(http.StatusNoContent)
	}
}

// @Summary Get immediate parent of a folder
// @Tags files
// @Produce json
// @Param parent_id path string true "folder id (the folder to get the parent of)"
// @Success 200 {object} models.Node "parent node, or null if none"
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security ApiKeyAuth
// @Router /folder/{parent_id}/parent [get]
func ParentHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("parent_id")
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "parent_id required"})
			return
		}

		uid, _ := c.Get("user_id")
		ownerID := uid.(string)

		node, err := fileRepo.FindNodeByID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if node == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		if node.OwnerID != ownerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}

		if node.ParentID == "" {
			c.JSON(http.StatusOK, nil)
			return
		}

		parent, err := fileRepo.FindNodeByID(node.ParentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if parent == nil {
			c.JSON(http.StatusOK, nil)
			return
		}

		if parent.OwnerID != ownerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}

		c.JSON(http.StatusOK, parent)
	}
}

// @Summary Get folder stats (items count and breakdown by file extension)
// @Tags files
// @Produce json
// @Param parent_id path string true "parent folder id (use empty string for root)"
// @Param recursive query bool false "include nested children recursively" default(false)
// @Success 200 {object} controllers.FolderStatsResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security ApiKeyAuth
// @Router /folders/{parent_id}/stats [get]
func FolderStatsHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		parentID := c.Param("parent_id")
		recursive := false
		if v := c.Query("recursive"); strings.ToLower(v) == "true" {
			recursive = true
		}

		uid, _ := c.Get("user_id")
		ownerID := uid.(string)

		if parentID != "" {
			parentNode, err := fileRepo.FindNodeByID(parentID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if parentNode == nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "parent not found"})
				return
			}
			if parentNode.OwnerID != ownerID {
				c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
				return
			}
		}

		var all []*models.Node
		var err error
		if recursive {
			all, err = collectNodesRecursive(fileRepo, ownerID, parentID)
		} else {
			children, e := fileRepo.ListChildren(ownerID, parentID)
			if e != nil {
				err = e
			} else {
				all = children
			}
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		total := len(all)
		counts := map[string]int{}
		for _, n := range all {
			var key string
			if n.Type == "folder" {
				key = "folder"
			} else {
				ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(n.Name), "."))
				if ext == "" {
					key = "unknown"
				} else {
					key = ext
				}
			}
			counts[key]++
		}

		stats := make([]FolderStat, 0, len(counts))
		for k, v := range counts {
			var pct float64
			if total > 0 {
				pct = (float64(v) / float64(total)) * 100.0
				pct = float64(int(pct*100+0.5)) / 100.0
			}
			stats = append(stats, FolderStat{
				Type:    k,
				Count:   v,
				Percent: pct,
			})
		}

		resp := FolderStatsResponse{
			ParentID:   parentID,
			TotalItems: total,
			Stats:      stats,
		}
		c.JSON(http.StatusOK, resp)
	}
}

// --- Move handler ---
// @Summary Move node (file or folder) to another parent (or root)
// @Tags files
// @Accept json
// @Produce json
// @Param id path string true "node id to move"
// @Param payload body moveReq true "new parent id (empty string for root)"
// @Success 200 {object} models.Node
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security ApiKeyAuth
// @Router /move/{id} [post]
func MoveHandler(fileRepo repository.FileRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var req moveReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		uid, _ := c.Get("user_id")
		ownerID := uid.(string)

		node, err := fileRepo.FindNodeByID(id)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if node == nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "node not found"})
			return
		}
		if node.OwnerID != ownerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}

		newParentID := req.ParentID

		if node.ParentID == newParentID {
			c.JSON(http.StatusOK, node)
			return
		}

		if newParentID != "" {
			parentNode, err := fileRepo.FindNodeByID(newParentID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			if parentNode == nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "target parent not found"})
				return
			}
			if parentNode.OwnerID != ownerID {
				c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
				return
			}
			if parentNode.Type != "folder" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "target parent is not a folder"})
				return
			}
		}

		if node.Type == "folder" && newParentID != "" {
			descendants, err := collectNodesRecursive(fileRepo, ownerID, node.ID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			for _, d := range descendants {
				if d.ID == newParentID {
					c.JSON(http.StatusBadRequest, gin.H{"error": "cannot move folder into its own descendant"})
					return
				}
			}
		}

		node.ParentID = newParentID

		if err := fileRepo.UpdateNodeParent(ownerID, node.ID, newParentID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		node.ParentID = newParentID
		c.JSON(http.StatusOK, node)
	}
}

func collectNodesRecursive(fileRepo repository.FileRepository, ownerID, parentID string) ([]*models.Node, error) {
	var result []*models.Node
	stack := []string{parentID}
	visitedFolders := map[string]bool{}

	for len(stack) > 0 {
		p := stack[len(stack)-1]
		stack = stack[:len(stack)-1]

		if p != "" {
			if visitedFolders[p] {
				continue
			}
			visitedFolders[p] = true
		}

		children, err := fileRepo.ListChildren(ownerID, p)
		if err != nil {
			return nil, err
		}
		for _, ch := range children {
			result = append(result, ch)
			if ch.Type == "folder" {
				stack = append(stack, ch.ID)
			}
		}
	}
	return result, nil
}

// helper
func DeleteRecursive(fileRepo repository.FileRepository, storage *services.StorageService, node *models.Node) error {
	children, _ := fileRepo.ListChildren(node.OwnerID, node.ID)
	for _, ch := range children {
		if ch.Type == "file" {
			_ = storage.DeleteFile(ch.Path)
			_ = fileRepo.DeleteNode(ch.ID)
		} else {
			_ = DeleteRecursive(fileRepo, storage, ch)
			_ = fileRepo.DeleteNode(ch.ID)
		}
	}
	return nil
}
