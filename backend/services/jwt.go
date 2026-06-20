package services

import (
	"fmt"
	"time"

	"ischat/config"
	"ischat/models"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(userID string, role string) (string, error) {

	claims := models.UserTokenClaims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(
				time.Now().Add(time.Hour),
			),
			IssuedAt: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	return token.SignedString(
		[]byte(config.GetEnv("JWT_SECRET")),
	)
}

func ValidateToken(tokenString string) (*models.UserTokenClaims, error) {

	token, err := jwt.ParseWithClaims(
		tokenString,
		&models.UserTokenClaims{},
		func(token *jwt.Token) (interface{}, error) {
			return []byte(config.GetEnv("JWT_SECRET")), nil
		},
	)

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*models.UserTokenClaims)

	if !ok {
		return nil, fmt.Errorf("invalid claims")
	}

	return claims, nil
}
