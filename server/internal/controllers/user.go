package controllers

import (
	"net/http"
	"time"

	"server/internal/services"

	"github.com/gin-gonic/gin"
)

type userRes struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	Email     string    `json:"email" bson:"email"`
	Name      string    `json:"name,omitempty" bson:"name,omitempty"`
	AvatarURL string    `json:"avatar_url,omitempty" bson:"avatar_url,omitempty"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

// @Summary Get current user
// @Description Returns the authenticated user's profile information extracted from the JWT.
// @Tags user
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} userRes
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /me [get]
func GetMeHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidI, ok := c.Get("user_id")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		uid := uidI.(string)
		u, err := s.GetProfile(uid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, u)
	}
}

// @Summary Update profile (name or avatar)
// @Description Update the authenticated user's profile. Accepts multipart/form-data for avatar upload or a JSON body with `name`.
// @Tags user
// @Accept multipart/form-data
// @Accept json
// @Produce json
// @Param name formData string false "Display name"
// @Param avatar formData file false "Avatar image file (multipart/form-data)"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /me/profile [post]
func UpdateProfileHandler(s *services.AuthService, storageSvc *services.StorageService) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidI, ok := c.Get("user_id")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		uid := uidI.(string)

		name := c.PostForm("name")
		var avatarPath string

		if fh, err := c.FormFile("avatar"); err == nil && fh != nil {
			saved, _, err := storageSvc.SaveFile(uid, fh)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save avatar: " + err.Error()})
				return
			}
			avatarPath = saved
		} else {
			if name == "" {
				var jb struct {
					Name string `json:"name"`
				}
				_ = c.ShouldBindJSON(&jb)
				if jb.Name != "" {
					name = jb.Name
				}
			}
		}

		u, err := s.UpdateProfile(uid, name, avatarPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, u)
	}
}

type changeEmailReq struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewEmail        string `json:"new_email" binding:"required,email"`
}

// @Summary Change email
// @Description Change the authenticated user's email. Requires current password for confirmation.
// @Tags user
// @Accept json
// @Produce json
// @Param payload body changeEmailReq true "current password and new email"
// @Security ApiKeyAuth
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /me/email [post]
func ChangeEmailHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidI, ok := c.Get("user_id")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		uid := uidI.(string)
		var body changeEmailReq
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		u, err := s.ChangeEmail(uid, body.CurrentPassword, body.NewEmail)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, u)
	}
}

type changePasswordReq struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// @Summary Change password
// @Description Change the authenticated user's password. Requires current password for confirmation. This will not return a body (204).
// @Tags user
// @Accept json
// @Produce json
// @Param payload body changePasswordReq true "current password and new password"
// @Security ApiKeyAuth
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /me/password [post]
func ChangePasswordHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		uidI, ok := c.Get("user_id")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		uid := uidI.(string)
		var body changePasswordReq
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := s.ChangePassword(uid, body.CurrentPassword, body.NewPassword); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
