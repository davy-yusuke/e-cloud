package services

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"os"
	"time"

	"server/internal/models"
	"server/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo repository.UserRepository

	accessTTL  time.Duration
	refreshTTL time.Duration
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func NewAuthService(r repository.UserRepository) *AuthService {

	return &AuthService{
		repo:       r,
		accessTTL:  15 * time.Minute,
		refreshTTL: 7 * 24 * time.Hour,
	}
}

func (s *AuthService) createAccessToken(u *models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("jwt secret not configured")
	}
	claims := jwt.MapClaims{
		"sub":   u.ID,
		"email": u.Email,
		"exp":   time.Now().Add(s.accessTTL).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func generateRawRefreshToken() (string, error) {

	id, err := uuid.NewRandom()
	if err != nil {
		return "", err
	}
	return id.String(), nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func (s *AuthService) Register(email, password, name string) (*models.User, error) {
	if email == "" || password == "" {
		return nil, errors.New("email and password required")
	}
	existing, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("user already exists")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	u := &models.User{
		Email:        email,
		PasswordHash: string(hashed),
		Name:         name,
	}
	if err := s.repo.Create(u); err != nil {
		return nil, err
	}
	u.PasswordHash = ""
	return u, nil
}

func (s *AuthService) Login(email, password string) (*TokenPair, error) {
	u, err := s.repo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, errors.New("invalid credentials")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	at, err := s.createAccessToken(u)
	if err != nil {
		return nil, err
	}

	rawRt, err := generateRawRefreshToken()
	if err != nil {
		return nil, err
	}
	hashed := hashToken(rawRt)
	expiresAt := time.Now().Add(s.refreshTTL).Unix()

	if err := s.repo.StoreRefreshToken(hashed, u.ID, expiresAt); err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  at,
		RefreshToken: rawRt,
	}, nil
}

func (s *AuthService) Refresh(rawRefresh string) (*TokenPair, error) {
	if rawRefresh == "" {
		return nil, errors.New("refresh token required")
	}
	hashed := hashToken(rawRefresh)
	userID, exp, err := s.repo.FindUserIDByRefreshToken(hashed)
	if err != nil {
		return nil, err
	}
	if userID == "" {
		return nil, errors.New("invalid refresh token")
	}
	if exp <= time.Now().Unix() {
		_ = s.repo.DeleteRefreshToken(hashed)
		return nil, errors.New("refresh token expired")
	}

	u, err := s.repo.FindByID(userID)
	if err != nil || u == nil {
		return nil, errors.New("user not found")
	}

	at, err := s.createAccessToken(u)
	if err != nil {
		return nil, err
	}

	_ = s.repo.DeleteRefreshToken(hashed)

	newRaw, err := generateRawRefreshToken()
	if err != nil {
		return nil, err
	}
	newHash := hashToken(newRaw)
	newExp := time.Now().Add(s.refreshTTL).Unix()
	if err := s.repo.StoreRefreshToken(newHash, u.ID, newExp); err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  at,
		RefreshToken: newRaw,
	}, nil
}

func (s *AuthService) RevokeRefreshToken(rawRefresh string) error {
	if rawRefresh == "" {
		return errors.New("refresh token required")
	}
	hashed := hashToken(rawRefresh)
	return s.repo.DeleteRefreshToken(hashed)
}

func (s *AuthService) RevokeAllForUser(userID string) error {
	return s.repo.DeleteAllRefreshTokensForUser(userID)
}

func (s *AuthService) GetProfile(userID string) (*models.User, error) {
	u, err := s.repo.FindByID(userID)
	if err != nil || u == nil {
		return nil, err
	}

	u.PasswordHash = ""
	return u, nil
}

func (s *AuthService) UpdateProfile(userID, name, avatarURL string) (*models.User, error) {
	u, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, errors.New("user not found")
	}
	if name != "" {
		u.Name = name
	}
	if avatarURL != "" {
		u.AvatarURL = avatarURL
	}
	u.UpdatedAt = time.Now()
	if err := s.repo.UpdateUser(u); err != nil {
		return nil, err
	}
	u.PasswordHash = ""
	return u, nil
}

func (s *AuthService) ChangeEmail(userID, currentPassword, newEmail string) (*models.User, error) {
	if newEmail == "" {
		return nil, errors.New("new email required")
	}
	u, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(currentPassword)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	existing, err := s.repo.FindByEmail(newEmail)
	if err != nil {
		return nil, err
	}
	if existing != nil && existing.ID != u.ID {
		return nil, errors.New("email already in use")
	}
	u.Email = newEmail
	u.UpdatedAt = time.Now()
	if err := s.repo.UpdateUser(u); err != nil {
		return nil, err
	}
	u.PasswordHash = ""
	return u, nil
}

func (s *AuthService) ChangePassword(userID, currentPassword, newPassword string) error {
	if len(newPassword) < 8 {
		return errors.New("new password too short")
	}
	u, err := s.repo.FindByID(userID)
	if err != nil {
		return err
	}
	if u == nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("invalid credentials")
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hashed)
	u.UpdatedAt = time.Now()
	return s.repo.UpdateUser(u)
}
