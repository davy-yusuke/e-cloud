package controllers

import (
	"net/http"
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

type registerReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name,omitempty"`
}

// @Summary Register
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body registerReq true "email and password"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /auth/register [post]
func RegisterHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body registerReq
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		u, err := s.Register(body.Email, body.Password, body.Name)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"user": u})
	}
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type loginRes struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// @Summary Login
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body loginReq true "email and password"
// @Success 200 {object} loginRes
// @Failure 401 {object} map[string]string
// @Router /auth/login [post]
func LoginHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body loginReq
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		tp, err := s.Login(body.Email, body.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"access_token": tp.AccessToken, "refresh_token": tp.RefreshToken})
	}
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type refreshRes struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// @Summary Refresh tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body refreshReq true "refresh token"
// @Success 200 {object} refreshRes
// @Failure 401 {object} map[string]string
// @Router /auth/refresh [post]
func RefreshHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body refreshReq
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		tp, err := s.Refresh(body.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"access_token": tp.AccessToken, "refresh_token": tp.RefreshToken})
	}
}

type logoutReq struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// @Summary Logout (revoke refresh token)
// @Tags auth
// @Accept json
// @Produce json
// @Param payload body logoutReq true "refresh token to revoke"
// @Success 200
// @Failure 400 {object} map[string]string
// @Router /auth/logout [post]
func LogoutHandler(s *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var body logoutReq
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := s.RevokeRefreshToken(body.RefreshToken); err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}
