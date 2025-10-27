import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Permission } from '@/types';
import { permissionService } from '@/services/permissionService';

interface PermissionToggleGroupProps {
  category: string;
  permissions: Permission[];
  values: Record<string, 'inherit' | 'grant' | 'revoke'>;
  onChange: (permissionKey: string, value: 'inherit' | 'grant' | 'revoke') => void;
  disabled?: boolean;
  showDescriptions?: boolean;
  compact?: boolean;
}

export const PermissionToggleGroup: React.FC<PermissionToggleGroupProps> = ({
  category,
  permissions,
  values,
  onChange,
  disabled = false,
  showDescriptions = true,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getToggleValue = (permissionKey: string): 'inherit' | 'grant' | 'revoke' => {
    return values[permissionKey] || 'inherit';
  };

  const handleToggle = (permissionKey: string, currentValue: 'inherit' | 'grant' | 'revoke') => {
    let newValue: 'inherit' | 'grant' | 'revoke';
    
    switch (currentValue) {
      case 'inherit':
        newValue = 'grant';
        break;
      case 'grant':
        newValue = 'revoke';
        break;
      case 'revoke':
        newValue = 'inherit';
        break;
      default:
        newValue = 'grant';
    }
    
    onChange(permissionKey, newValue);
  };

  const getToggleLabel = (value: 'inherit' | 'grant' | 'revoke') => {
    switch (value) {
      case 'inherit':
        return 'Inherit';
      case 'grant':
        return 'Grant';
      case 'revoke':
        return 'Revoke';
      default:
        return 'Inherit';
    }
  };

  const getToggleColor = (value: 'inherit' | 'grant' | 'revoke') => {
    switch (value) {
      case 'inherit':
        return 'bg-gray-100 text-gray-700';
      case 'grant':
        return 'bg-green-100 text-green-700';
      case 'revoke':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getScopeBadge = (scope: 'global' | 'project') => {
    return scope === 'project' ? (
      <Badge variant="outline" className="text-xs">
        Project
      </Badge>
    ) : (
      <Badge variant="secondary" className="text-xs">
        Global
      </Badge>
    );
  };

  if (permissions.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <CardTitle className="text-lg">
                  {permissionService.getCategoryDisplayName(category)}
                </CardTitle>
                <Badge variant="outline">
                  {permissions.length}
                </Badge>
              </div>
            </div>
            {showDescriptions && (
              <CardDescription>
                Manage {category.toLowerCase()} related permissions
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {permissions.map((permission) => {
              const currentValue = getToggleValue(permission.permission_key);
              const isInherit = currentValue === 'inherit';
              
              return (
                <div
                  key={permission.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    compact ? 'py-2' : 'py-3'
                  } ${
                    isInherit 
                      ? 'bg-muted/30 border-muted' 
                      : currentValue === 'grant'
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label 
                        htmlFor={`permission-${permission.id}`}
                        className="font-medium text-sm cursor-pointer"
                      >
                        {permission.permission_name}
                      </Label>
                      {getScopeBadge(permission.scope)}
                    </div>
                    
                    {showDescriptions && permission.permission_description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {permission.permission_description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getToggleColor(currentValue)}`}
                    >
                      {getToggleLabel(currentValue)}
                    </Badge>
                    
                    <Switch
                      id={`permission-${permission.id}`}
                      checked={currentValue !== 'inherit'}
                      onCheckedChange={() => handleToggle(permission.permission_key, currentValue)}
                      disabled={disabled}
                      className="data-[state=checked]:bg-green-600"
                    />
                  </div>
                </div>
              );
            })}
            
            {permissions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No permissions in this category</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
