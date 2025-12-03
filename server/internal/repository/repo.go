package repository

//go:generate mockery --name=UserRepository --output=mocks --outpkg=mocks

import "server/internal/models"

type UserRepository interface {
	// user
	Create(u *models.User) error
	FindByEmail(email string) (*models.User, error)
	FindByID(id string) (*models.User, error)
	UpdateUser(u *models.User) error

	StoreRefreshToken(tokenHash, userID string, expiresAt int64) error
	FindUserIDByRefreshToken(tokenHash string) (string, int64, error)
	DeleteRefreshToken(tokenHash string) error
	DeleteAllRefreshTokensForUser(userID string) error
}
