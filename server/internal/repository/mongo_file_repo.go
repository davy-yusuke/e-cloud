package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"server/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MongoFileRepo struct {
	col *mongo.Collection
}

func NewMongoFileRepo(client *mongo.Client, dbName string) (*MongoFileRepo, error) {
	col := client.Database(dbName).Collection("nodes")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = col.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "owner_id", Value: 1}, {Key: "parent_id", Value: 1}},
		Options: options.Index().SetBackground(true),
	})
	return &MongoFileRepo{col: col}, nil
}

func (r *MongoFileRepo) UpdateNodeParent(ownerID, nodeID, parentID string) error {

	oid, err := primitive.ObjectIDFromHex(nodeID)
	if err != nil {
		return err
	}

	filter := bson.M{
		"_id":      oid,
		"owner_id": ownerID,
	}

	update := bson.M{"$set": bson.M{"parent_id": parentID, "updated_at": time.Now()}}

	res, err := r.col.UpdateOne(context.Background(), filter, update)
	if err != nil {
		return err
	}
	if res.MatchedCount == 0 {
		return errors.New("node not found or not owner")
	}
	return nil
}

func (r *MongoFileRepo) CreateNode(n *models.Node) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	n.CreatedAt = time.Now()
	n.UpdatedAt = n.CreatedAt

	raw, err := bson.Marshal(n)
	if err != nil {
		return err
	}
	var doc bson.M
	if err := bson.Unmarshal(raw, &doc); err != nil {
		return err
	}

	if pid, ok := doc["parent_id"].(string); ok && pid != "" {
		if poid, err := primitive.ObjectIDFromHex(pid); err == nil {
			doc["parent_id"] = poid
		} else {
			doc["parent_id"] = pid
		}
	}

	res, err := r.col.InsertOne(ctx, doc)
	if err != nil {
		return err
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		n.ID = oid.Hex()
	}
	return nil
}

func (r *MongoFileRepo) FindNodeByID(id string) (*models.Node, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var n models.Node
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&n); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &n, nil
}

func (r *MongoFileRepo) ListChildren(ownerID, parentID string) ([]*models.Node, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	fmt.Println("parentID", parentID)

	filter := bson.M{"owner_id": ownerID}
	if parentID == "" {
		filter["parent_id"] = bson.M{"$exists": false}
	} else {

		if oid, err := primitive.ObjectIDFromHex(parentID); err == nil {

			filter["parent_id"] = bson.M{"$in": []interface{}{oid, parentID}}
		} else {

			filter["parent_id"] = parentID
		}
	}

	cur, err := r.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var out []*models.Node
	for cur.Next(ctx) {
		var n models.Node
		if err := cur.Decode(&n); err != nil {
			return nil, err
		}
		out = append(out, &n)
	}
	return out, nil
}

func (r *MongoFileRepo) DeleteNode(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	if err != nil {
		return err
	}
	return nil
}

func (r *MongoFileRepo) UpdateNode(n *models.Node) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	oid, err := primitive.ObjectIDFromHex(n.ID)
	if err != nil {
		return err
	}
	n.UpdatedAt = time.Now()
	_, err = r.col.ReplaceOne(ctx, bson.M{"_id": oid}, n)
	return err
}
