package repository

import (
	"context"
	"errors"
	"time"

	"server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoUserRepo struct {
	usersCol  *mongo.Collection
	tokensCol *mongo.Collection
}

func NewMongoUserRepo(client *mongo.Client, dbName string) (*MongoUserRepo, error) {
	users := client.Database(dbName).Collection("users")
	tokens := client.Database(dbName).Collection("refresh_tokens")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	_, _ = tokens.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "token_hash", Value: 1}},
		Options: options.Index().SetUnique(true),
	})

	_, _ = tokens.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	})

	return &MongoUserRepo{
		usersCol:  users,
		tokensCol: tokens,
	}, nil
}

func (r *MongoUserRepo) Create(u *models.User) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	u.CreatedAt = time.Now()
	res, err := r.usersCol.InsertOne(ctx, u)
	if err != nil {

		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		u.ID = oid.Hex()
	}
	return nil
}

func (r *MongoUserRepo) FindByEmail(email string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var u models.User
	if err := r.usersCol.FindOne(ctx, bson.M{"email": email}).Decode(&u); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *MongoUserRepo) FindByID(id string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var u models.User
	if err := r.usersCol.FindOne(ctx, bson.M{"_id": oid}).Decode(&u); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

func (r *MongoUserRepo) StoreRefreshToken(tokenHash, userID string, expiresAt int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	doc := bson.M{
		"token_hash": tokenHash,
		"user_id":    userID,
		"expires_at": expiresAt,
		"created_at": time.Now(),
	}
	_, err := r.tokensCol.InsertOne(ctx, doc)
	if err != nil {

		return err
	}
	return nil
}

func (r *MongoUserRepo) FindUserIDByRefreshToken(tokenHash string) (string, int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var doc struct {
		UserID    string `bson:"user_id"`
		ExpiresAt int64  `bson:"expires_at"`
	}
	err := r.tokensCol.FindOne(ctx, bson.M{"token_hash": tokenHash}).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return "", 0, nil
		}
		return "", 0, err
	}

	if doc.ExpiresAt <= time.Now().Unix() {
		return "", doc.ExpiresAt, errors.New("expired")
	}
	return doc.UserID, doc.ExpiresAt, nil
}

func (r *MongoUserRepo) DeleteRefreshToken(tokenHash string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := r.tokensCol.DeleteOne(ctx, bson.M{"token_hash": tokenHash})
	return err
}

func (r *MongoUserRepo) DeleteAllRefreshTokensForUser(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := r.tokensCol.DeleteMany(ctx, bson.M{"user_id": userID})
	return err
}

func (r *MongoUserRepo) UpdateUser(u *models.User) error {
	if u == nil || u.ID == "" {
		return errors.New("invalid user")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(u.ID)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"email":         u.Email,
			"name":          u.Name,
			"avatar_url":    u.AvatarURL,
			"password_hash": u.PasswordHash,
			"updated_at":    time.Now(),
		},
	}

	set := update["$set"].(bson.M)
	if u.Email == "" {
		delete(set, "email")
	}
	if u.Name == "" {
		delete(set, "name")
	}
	if u.AvatarURL == "" {
		delete(set, "avatar_url")
	}
	if u.PasswordHash == "" {
		delete(set, "password_hash")
	}

	if len(set) == 0 {

		update = bson.M{"$set": bson.M{"updated_at": time.Now()}}
	} else {
		update["$set"] = set
	}

	_, err = r.usersCol.UpdateOne(ctx, bson.M{"_id": oid}, update)
	return err
}
