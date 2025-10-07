import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';

// Standalone version of NewProjectButton for when @odh-dashboard/internal is not available
interface NewProjectButtonProps {
  closeOnCreate?: boolean;
  onProjectCreated?: (projectName: string) => void;
}

const NewProjectButton: React.FC<NewProjectButtonProps> = ({
  closeOnCreate = false,
  onProjectCreated,
}) => {
  const handleCreateProject = () => {
    // In standalone mode, we'll just show a simple message
    // In a real implementation, this would open a modal or navigate to a project creation page
    const projectName = `project-${Date.now()}`;
    if (onProjectCreated) {
      onProjectCreated(projectName);
    }
  };

  return (
    <Button
      variant="primary"
      icon={<PlusIcon />}
      onClick={handleCreateProject}
    >
      Create Project
    </Button>
  );
};

export default NewProjectButton;
