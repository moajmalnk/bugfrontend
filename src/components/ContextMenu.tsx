import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from '@/context/ThemeContext';

interface ContextMenuItem {
  label: string;
  action: () => void;
  shortcut?: string;
}

interface ContextMenuProps {
  mouseX: number | null;
  mouseY: number | null;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ mouseX, mouseY, onClose }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

  // Define menu items based on user role
  const getMenuItems = (role: User['role'] | undefined) => {
    const commonItems = [
      { label: 'Profile', action: () => { navigate('/profile'); onClose(); } },
      { label: 'Dark or Light', action: () => { toggleTheme(); onClose(); }, shortcut: 'Shift+Space' },
      { label: 'Privacy Mode', action: () => { /* TODO: Implement privacy mode toggle */ onClose(); }, shortcut: 'Ctrl+Space' },
      { label: 'Refresh', action: () => { window.location.reload(); onClose(); } },
    ];

    if (role === 'admin') {
      return [
        { label: 'Projects', action: () => { navigate('/projects'); onClose(); } },
        { label: 'Bugs', action: () => { navigate('/bugs'); onClose(); } },
        { label: 'Fixes', action: () => { navigate('/fixes'); onClose(); } },
        { label: 'Users', action: () => { navigate('/users'); onClose(); } },
        ...commonItems,
        { label: 'Settings', action: () => { navigate('/settings'); onClose(); } },
      ];
    } else if (role === 'developer') {
      return [
        { label: 'Fixes', action: () => { navigate('/fixes'); onClose(); } },
        ...commonItems,
      ];
    } else if (role === 'tester') {
      return [
        { label: 'Bugs', action: () => { navigate('/bugs'); onClose(); } },
        ...commonItems,
      ];
    }
    // Default for unauthenticated or other roles
    return commonItems;
  };

  const menuItems = getMenuItems(currentUser?.role);

  // Use the mouse position to control the open state
  const isOpen = mouseX !== null && mouseY !== null;

  // If no menu items or not open, render nothing
  if (!isOpen || menuItems.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={onClose}>
      <DropdownMenuContent
        style={{
          position: 'fixed',
          top: mouseY || 0,
          left: mouseX || 0,
          marginTop: '5px',
          marginLeft: '5px',
        }}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {menuItems.map((item, index) => (
          <DropdownMenuItem key={index} onClick={item.action}>
            {item.label}
            {item.shortcut && <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContextMenu;