package repository

//go:generate mockery --name=FileRepository --output=mocks --outpkg=mocks

import (
	"server/internal/models"
)

type FileRepository interface {
	CreateNode(n *models.Node) error
	FindNodeByID(id string) (*models.Node, error)
	ListChildren(ownerID, parentID string) ([]*models.Node, error)
	DeleteNode(id string) error
	UpdateNode(n *models.Node) error
	UpdateNodeParent(ownerID, nodeID, parentID string) error
}
