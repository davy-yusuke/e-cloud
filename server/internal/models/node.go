package models

import "time"

type Node struct {
	ID        string    `json:"id" bson:"_id,omitempty"`
	OwnerID   string    `json:"owner_id" bson:"owner_id"`
	ParentID  string    `json:"parent_id,omitempty" bson:"parent_id,omitempty"` // root: empty
	Name      string    `json:"name" bson:"name"`
	Type      string    `json:"type" bson:"type"`                     // "file" | "folder"
	Size      int64     `json:"size,omitempty" bson:"size,omitempty"` // bytes for files
	Mime      string    `json:"mime,omitempty" bson:"mime,omitempty"`
	Path      string    `json:"path,omitempty" bson:"path,omitempty"`
	CreatedAt time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}
