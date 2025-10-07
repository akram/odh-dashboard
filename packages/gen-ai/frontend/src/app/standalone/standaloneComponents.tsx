import * as React from 'react';
import { DEPLOYMENT_MODE } from '~/app/utilities/const';
import { DeploymentMode } from 'mod-arch-core';

// Standalone components
import ScrewWrenchIcon from './ScrewWrenchIcon';
import { ProjectIconWithSize, IconSize } from './ProjectIconWithSize';
import ProjectSelector from './ProjectSelector';
import NewProjectButton from './NewProjectButton';

// Re-export types for compatibility
export { IconSize };

// Conditional exports based on deployment mode
export const getScrewWrenchIcon = () => {
  if (DEPLOYMENT_MODE === DeploymentMode.Standalone) {
    return ScrewWrenchIcon;
  }
  // In federated mode, try to import from @odh-dashboard/internal
  try {
    return require('@odh-dashboard/internal/images/icons/ScrewWrenchIcon').default;
  } catch {
    return ScrewWrenchIcon;
  }
};

export const getProjectIconWithSize = () => {
  if (DEPLOYMENT_MODE === DeploymentMode.Standalone) {
    return ProjectIconWithSize;
  }
  // In federated mode, try to import from @odh-dashboard/internal
  try {
    return require('@odh-dashboard/internal/concepts/projects/ProjectIconWithSize').ProjectIconWithSize;
  } catch {
    return ProjectIconWithSize;
  }
};

export const getProjectSelector = () => {
  if (DEPLOYMENT_MODE === DeploymentMode.Standalone) {
    return ProjectSelector;
  }
  // In federated mode, try to import from @odh-dashboard/internal
  try {
    return require('@odh-dashboard/internal/concepts/projects/ProjectSelector').default;
  } catch {
    return ProjectSelector;
  }
};

export const getNewProjectButton = () => {
  if (DEPLOYMENT_MODE === DeploymentMode.Standalone) {
    return NewProjectButton;
  }
  // In federated mode, try to import from @odh-dashboard/internal
  try {
    return require('@odh-dashboard/internal/pages/projects/screens/projects/NewProjectButton').default;
  } catch {
    return NewProjectButton;
  }
};

// Export types that might be needed
export const getIconSize = () => {
  if (DEPLOYMENT_MODE === DeploymentMode.Standalone) {
    return IconSize;
  }
  // In federated mode, try to import from @odh-dashboard/internal
  try {
    return require('@odh-dashboard/internal/types').IconSize;
  } catch {
    return IconSize;
  }
};
