import * as React from 'react';
import { Select, SelectOption } from '@patternfly/react-core';

// Standalone version of ProjectSelector for when @odh-dashboard/internal is not available
interface ProjectSelectorProps {
  onSelection: (projectName: string) => void;
  namespace: string;
  isLoading?: boolean;
  namespacesOverride?: Array<{ name: string; displayName?: string }>;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  onSelection,
  namespace,
  isLoading = false,
  namespacesOverride = [],
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string>(namespace);

  const onToggle = (isOpen: boolean) => {
    setIsOpen(isOpen);
  };

  const onSelect = (event: React.MouseEvent<Element, MouseEvent> | undefined, selection: string | number | undefined) => {
    const selectedValue = selection as string;
    setSelected(selectedValue);
    setIsOpen(false);
    onSelection(selectedValue);
  };

  const options = namespacesOverride.map((ns) => (
    <SelectOption key={ns.name} value={ns.name}>
      {ns.displayName || ns.name}
    </SelectOption>
  ));

  return (
    <Select
      onToggle={onToggle}
      onSelect={onSelect}
      selections={selected}
      isOpen={isOpen}
      isDisabled={isLoading}
    >
      {options}
    </Select>
  );
};

export default ProjectSelector;
