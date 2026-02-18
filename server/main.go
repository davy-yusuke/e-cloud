package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"server/internal/controllers"
	"server/internal/middleware"
	"server/internal/repository"
	"server/internal/services"

	"github.com/gin-gonic/gin"
	cors "github.com/rs/cors/wrapper/gin"

	_ "server/docs"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// @title e-cloud API
// @version 1.0
// @description Auth API example
// @host http://localhost:8080
// @BasePath /
func main() {
	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
	}
	dbName := os.Getenv("MONGO_DB")
	if dbName == "" {
		dbName = "e-cloud"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongo connect error: %v", err)
	}
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("mongo ping error: %v", err)
	}

	repo, err := repository.NewMongoUserRepo(client, dbName)
	if err != nil {
		log.Fatalf("failed to init repo: %v", err)
	}

	authSrv := services.NewAuthService(repo)

	r := gin.Default()

	allowedOrigins := []string{"http://localhost:3000"}
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = strings.Split(origins, ",")
	}

	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowCredentials: true,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "Origin"},
	})

	r.Use(c)

	r.POST("/auth/register", controllers.RegisterHandler(authSrv))
	r.POST("/auth/login", controllers.LoginHandler(authSrv))
	r.POST("/auth/refresh", controllers.RefreshHandler(authSrv))
	r.POST("/auth/logout", controllers.LogoutHandler(authSrv))
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	fileRepo, err := repository.NewMongoFileRepo(client, dbName)
	if err != nil {
		log.Fatalf("failed to init file repo: %v", err)
	}
	storageBase := os.Getenv("STORAGE_BASE")
	if storageBase == "" {
		storageBase = "./storage"
	}
	storageSvc := services.NewStorageService(storageBase, 100<<20)

	authMw := middleware.AuthMiddleware()

	r.POST("/folders", authMw, controllers.CreateFolderHandler(fileRepo))
	r.GET("/files", authMw, controllers.ListHandler(fileRepo))
	r.GET("/folders/:parent_id", authMw, controllers.FoldersListHandler(fileRepo))
	r.POST("/files/upload", authMw, controllers.UploadHandler(fileRepo, storageSvc))
	r.POST("/files/unzip", authMw, controllers.UnzipHandler(fileRepo, storageSvc))
	r.POST("/move/:id", authMw, controllers.MoveHandler(fileRepo))
	r.GET("/files/:id/download", authMw, controllers.DownloadHandler(fileRepo))
	r.DELETE("/files/:id", authMw, controllers.DeleteHandler(fileRepo, storageSvc))
	r.GET("/folder/:parent_id/parent", authMw, controllers.ParentHandler(fileRepo))
	r.GET("/folders/:parent_id/stats", authMw, controllers.FolderStatsHandler(fileRepo))

	r.GET("/me", authMw, controllers.GetMeHandler(authSrv))
	r.POST("/me/profile", authMw, controllers.UpdateProfileHandler(authSrv, storageSvc))
	r.POST("/me/email", authMw, controllers.ChangeEmailHandler(authSrv))
	r.POST("/me/password", authMw, controllers.ChangePasswordHandler(authSrv))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	_ = r.Run(":" + port)
}
