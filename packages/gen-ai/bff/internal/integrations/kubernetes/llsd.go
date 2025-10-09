package kubernetes

import (
	"os"
	"strings"

	lsdapi "github.com/llamastack/llama-stack-k8s-operator/api/v1alpha1"
)

// getDistributionType returns the appropriate DistributionType based on the LLAMASTACK_DISTRIBUTION_NAME environment variable.
// If the variable is not set, returns a DistributionType with Name="rh".
// If the variable contains a slash (/), returns a DistributionType with Image set to the variable value.
// Otherwise, returns a DistributionType with Name set to the variable value.
func (kc *TokenKubernetesClient) getDistributionType() lsdapi.DistributionType {
	defaultImage := os.Getenv("LLAMASTACK_DISTRIBUTION_NAME")
	if defaultImage == "" {
		return lsdapi.DistributionType{
			Name: "rh",
		}
	}

	// If the value looks like an image URL (contains a slash), use it as Image
	// Otherwise, use it as Name
	if strings.Contains(defaultImage, "/") {
		return lsdapi.DistributionType{
			Image: defaultImage,
		}
	}
	return lsdapi.DistributionType{
		Name: defaultImage,
	}
}
