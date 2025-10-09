package kubernetes

import (
	"context"
	"fmt"
	"strings"

	kservev1alpha1 "github.com/kserve/kserve/pkg/apis/serving/v1alpha1"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// findSecretForLLMInferenceService finds the secret name associated with an LLMInferenceService
// Based on the pattern: {display-name}-{service-account-name}
func (kc *TokenKubernetesClient) findSecretForLLMInferenceService(ctx context.Context, llmSvc *kservev1alpha1.LLMInferenceService) string {
	// Get the display name from annotations
	displayName := kc.extractDisplayNameFromLLMInferenceService(llmSvc)
	if displayName == "" {
		displayName = llmSvc.Name
	}

	// List secrets in the namespace
	var secretList corev1.SecretList
	err := kc.Client.List(ctx, &secretList, client.InNamespace(llmSvc.Namespace))
	if err != nil {
		kc.Logger.Warn("failed to list secrets", "error", err, "namespace", llmSvc.Namespace)
		return fmt.Sprintf("%s-vllm-sa", displayName)
	}

	// Look for secrets with the expected pattern: {display-name}-{service-account-name}
	// Common service account names: vllm-sa, edit-test-sa, etc.
	possibleSuffixes := []string{"vllm-sa", "edit-test-sa", "default-sa"}

	for _, suffix := range possibleSuffixes {
		expectedSecretName := fmt.Sprintf("%s-%s", displayName, suffix)
		for _, secret := range secretList.Items {
			if secret.Name == expectedSecretName && secret.Type == corev1.SecretTypeServiceAccountToken {
				kc.Logger.Debug("found LLMInferenceService secret",
					"llmInferenceService", llmSvc.Name,
					"displayName", displayName,
					"secretName", secret.Name)
				return secret.Name
			}
		}
	}

	// If no exact match found, try to find any secret with the display name prefix
	for _, secret := range secretList.Items {
		if secret.Type == corev1.SecretTypeServiceAccountToken {
			if strings.HasPrefix(secret.Name, displayName+"-") {
				kc.Logger.Debug("found LLMInferenceService secret by prefix",
					"llmInferenceService", llmSvc.Name,
					"displayName", displayName,
					"secretName", secret.Name)
				return secret.Name
			}
		}
	}

	// If still no match, return the default pattern
	kc.Logger.Debug("no LLMInferenceService secret found, using default pattern",
		"llmInferenceService", llmSvc.Name,
		"displayName", displayName)
	return fmt.Sprintf("%s-vllm-sa", displayName)
}

// findLLMInferenceServiceByModelName finds an LLMInferenceService by its model name
func (kc *TokenKubernetesClient) findLLMInferenceServiceByModelName(ctx context.Context, namespace, modelName string) (*kservev1alpha1.LLMInferenceService, error) {
	// List all LLMInferenceServices in the namespace
	var llmSvcList kservev1alpha1.LLMInferenceServiceList
	err := kc.Client.List(ctx, &llmSvcList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Error("failed to list LLMInferenceServices", "error", err, "namespace", namespace)
		return nil, fmt.Errorf("failed to list LLMInferenceServices in namespace %s: %w", namespace, err)
	}

	// Find LLMInferenceService with name matching the model name
	for _, llmSvc := range llmSvcList.Items {
		if llmSvc.Name == modelName {
			kc.Logger.Info("found LLMInferenceService by model name", "modelName", modelName, "llmSvcName", llmSvc.Name, "namespace", namespace)
			return &llmSvc, nil
		}
	}

	return nil, fmt.Errorf("LLMInferenceService with model name '%s' not found in namespace %s", modelName, namespace)
}

// Helper method to find the secret containing the service account token
func (kc *TokenKubernetesClient) findSecretForServiceAccount(ctx context.Context, namespace, serviceAccountName string) string {
	// List secrets in the namespace
	var secretList corev1.SecretList
	err := kc.Client.List(ctx, &secretList, client.InNamespace(namespace))
	if err != nil {
		kc.Logger.Warn("failed to list secrets", "error", err, "namespace", namespace)
		return serviceAccountName + "-token"
	}

	// Find secret with the service account annotation
	for _, secret := range secretList.Items {
		if secret.Type == corev1.SecretTypeServiceAccountToken {
			if saName, exists := secret.Annotations["kubernetes.io/service-account.name"]; exists && saName == serviceAccountName {
				kc.Logger.Debug("found service account token secret",
					"serviceAccount", serviceAccountName,
					"secretName", secret.Name)
				return secret.Name
			}
		}
	}

	// If no secret found, return the expected pattern
	kc.Logger.Debug("no service account token secret found, using pattern",
		"serviceAccount", serviceAccountName)
	return serviceAccountName + "-token"
}

// Helper method to extract the actual token value and display name from a secret
func (kc *TokenKubernetesClient) extractTokenAndDisplayNameFromSecret(ctx context.Context, namespace, secretName string) (string, string) {
	if secretName == "" {
		return "", ""
	}

	// Get the secret
	var secret corev1.Secret
	key := client.ObjectKey{
		Namespace: namespace,
		Name:      secretName,
	}
	err := kc.Client.Get(ctx, key, &secret)
	if err != nil {
		kc.Logger.Warn("failed to get secret", "error", err, "secretName", secretName, "namespace", namespace)
		return "", ""
	}

	// Extract the token value
	tokenValue := ""
	if tokenData, exists := secret.Data["token"]; exists {
		tokenValue = string(tokenData)
	}

	// Extract the display name from annotations
	displayName := ""
	if displayNameData, exists := secret.Annotations["openshift.io/display-name"]; exists {
		displayName = displayNameData
	}

	return tokenValue, displayName
}

// findFirstLLMModelFromList finds the first LLM model from a list of model names
// It prioritizes LLMInferenceServices over regular InferenceServices
func (kc *TokenKubernetesClient) findFirstLLMModelFromList(ctx context.Context, namespace string, models []string) string {
	if len(models) == 0 {
		return ""
	}

	// First, try to find an LLMInferenceService
	for _, modelName := range models {
		llmSvc, err := kc.findLLMInferenceServiceByModelName(ctx, namespace, modelName)
		if err == nil && llmSvc != nil {
			kc.Logger.Debug("found LLM model from LLMInferenceService", "model", modelName)
			return modelName
		}
	}

	// If no LLMInferenceService found, check regular InferenceServices
	// (Note: In the current implementation, all InferenceServices are treated as LLM models)
	for _, modelName := range models {
		isvc, err := kc.findInferenceServiceByModelName(ctx, namespace, modelName)
		if err == nil && isvc != nil {
			kc.Logger.Debug("found LLM model from InferenceService", "model", modelName)
			return modelName
		}
	}

	// If no models found, return the first one as fallback
	kc.Logger.Debug("no LLM models found, using first model as fallback", "firstModel", models[0])
	return models[0]
}

// findVLLMSecretNameForModel finds the VLLM secret name by looking at the specified model's LLMInferenceService
func (kc *TokenKubernetesClient) findVLLMSecretNameForModel(ctx context.Context, namespace string, modelName string) string {
	if modelName == "" {
		kc.Logger.Debug("no model provided, using default secret name")
		return "default-name-vllm-sa"
	}

	// Get the model to find its associated LLMInferenceService
	llmSvc, err := kc.findLLMInferenceServiceByModelName(ctx, namespace, modelName)
	if err != nil {
		kc.Logger.Warn("failed to find LLMInferenceService for model, using default secret name", "model", modelName, "error", err)
		return "default-name-vllm-sa"
	}

	secretName := kc.findSecretForLLMInferenceService(ctx, llmSvc)
	kc.Logger.Debug("found VLLM secret name for model", "model", modelName, "secretName", secretName)
	return secretName
}
