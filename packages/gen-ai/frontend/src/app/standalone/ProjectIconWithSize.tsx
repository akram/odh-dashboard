import * as React from 'react';
import { ProjectDiagramIcon } from '@patternfly/react-icons';

// Standalone version of ProjectIconWithSize for when @odh-dashboard/internal is not available
export enum IconSize {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
}

interface ProjectIconWithSizeProps {
  size: IconSize;
}

const ProjectIconWithSize: React.FC<ProjectIconWithSizeProps> = ({ size }) => {
  const iconSize = size === IconSize.SM ? 'sm' : size === IconSize.MD ? 'md' : size === IconSize.LG ? 'lg' : 'xl';
  
  return <ProjectDiagramIcon size={iconSize as any} />;
};

export { ProjectIconWithSize };
