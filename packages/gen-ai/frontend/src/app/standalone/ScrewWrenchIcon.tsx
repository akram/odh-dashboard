import * as React from 'react';
import { WrenchIcon } from '@patternfly/react-icons';

// Standalone version of ScrewWrenchIcon for when @odh-dashboard/internal is not available
const ScrewWrenchIcon: React.FC<{ className?: string }> = ({ className }) => {
  return <WrenchIcon className={className} />;
};

export default ScrewWrenchIcon;
