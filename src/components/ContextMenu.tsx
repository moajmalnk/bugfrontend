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
import { Laptop, Moon, Sun, Folder, Bug, CheckSquare, Users, Settings, User as UserIcon, RefreshCw, Lock, Bell, Rss, PlusSquare } from 'lucide-react';

interface ContextMenuItem {
    label: string;
    action: () => void;
    shortcut?: string;
    icon?: React.ReactNode;
}

interface ContextMenuProps {
    mouseX: number | null;
    mouseY: number | null;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ mouseX, mouseY, onClose }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { toggleTheme, theme } = useTheme();

    // Define menu items based on user role
    const getMenuItems = (role: User['role'] | undefined): ContextMenuItem[] => {
        const commonItems: ContextMenuItem[] = [
            { label: 'Profile', action: () => { navigate(`/${role}/profile`); onClose(); }, icon: <UserIcon className="h-4 w-4" />, shortcut: 'Ctrl+Shift+P' },
            { label: 'Refresh', action: () => { window.location.reload(); onClose(); }, icon: <RefreshCw className="h-4 w-4" />, shortcut: 'Ctrl+R' },
            { label: 'Dark or Light', action: () => { toggleTheme(); onClose(); }, shortcut: 'Shift+Space', icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" /> },
            { label: 'Privacy Mode', action: () => { /* TODO: Implement privacy mode toggle */ onClose(); }, shortcut: 'Ctrl+Space', icon: <Lock className="h-4 w-4" /> },
        ];

        if (role === 'admin') {
            return [
                { label: 'New Bug', action: () => { navigate(`/${role}/bugs/new`); onClose(); }, shortcut: 'Ctrl+B', icon: <Bug className="h-4 w-4" /> },
                { label: 'Fix Bugs', action: () => { navigate(`/${role}/bugs`); onClose(); }, shortcut: 'Ctrl+Shift+F', icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'New Update', action: () => { navigate(`/${role}/new-update`); onClose(); }, shortcut: 'Ctrl+U', icon: <PlusSquare className="h-4 w-4" /> },
                { label: 'Projects', action: () => { navigate(`/${role}/projects`); onClose(); }, icon: <Folder className="h-4 w-4" /> },
                { label: 'Bugs', action: () => { navigate(`/${role}/bugs`); onClose(); }, icon: <Bug className="h-4 w-4" />, shortcut: 'Ctrl+Shift+B' },
                { label: 'Fixes', action: () => { navigate(`/${role}/fixes`); onClose(); }, shortcut: 'Ctrl+Shift+F', icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'Updates', action: () => { navigate(`/${role}/updates`); onClose(); }, shortcut: 'Ctrl+Shift+U', icon: <Rss className="h-4 w-4" /> },
                { label: 'Users', action: () => { navigate(`/${role}/users`); onClose(); }, icon: <Users className="h-4 w-4" /> },
                { label: 'Settings', action: () => { navigate(`/${role}/settings`); onClose(); }, icon: <Settings className="h-4 w-4" />, shortcut: 'Ctrl+Shift+S' },
                ...commonItems,
            ];
        } else if (role === 'developer') {
            return [
                { label: 'Fixes', action: () => { navigate(`/${role}/fixes`); onClose(); }, icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'Fix Bugs', action: () => { navigate(`/${role}/bugs`); onClose(); }, shortcut: 'Ctrl+Shift+F', icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'New Update', action: () => { navigate(`/${role}/new-update`); onClose(); }, shortcut: 'Ctrl+U', icon: <PlusSquare className="h-4 w-4" /> },
                { label: 'Updates', action: () => { navigate(`/${role}/updates`); onClose(); }, shortcut: 'Ctrl+Shift+U', icon: <Rss className="h-4 w-4" /> },
                ...commonItems,
            ];
        } else if (role === 'tester') {
            return [
                { label: 'Bugs', action: () => { navigate(`/${role}/bugs`); onClose(); }, icon: <Bug className="h-4 w-4" />, shortcut: 'Ctrl+Shift+B' },
                { label: 'New Bug', action: () => { navigate(`/${role}/bugs/new`); onClose(); }, shortcut: 'Ctrl+B', icon: <Bug className="h-4 w-4" /> },
                { label: 'New Update', action: () => { navigate(`/${role}/new-update`); onClose(); }, shortcut: 'Ctrl+U', icon: <PlusSquare className="h-4 w-4" /> },
                { label: 'Updates', action: () => { navigate(`/${role}/updates`); onClose(); }, shortcut: 'Ctrl+Shift+U', icon: <Rss className="h-4 w-4" /> },
                ...commonItems,
            ];
        }
        // Default for unauthenticated or other roles
        return [
            ...commonItems,
        ];
    };

    const menuItems = getMenuItems(currentUser?.role);

    // Use the mouse position to control the open state
    const isOpen = mouseX !== null && mouseY !== null;

    // If no menu items or not open, render nothing
    if (!isOpen || menuItems.length === 0) {
        return null;
    }

    // Calculate position to keep menu within viewport
    const menuWidth = 200; // Approximate width, or measure dynamically if needed
    const estimatedMenuHeight = menuItems.length * 30 + 20; // Estimate height (approx 30px per item + padding)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let finalX = mouseX || 0;
    let finalY = mouseY || 0;

    const buffer = 10; // px buffer from viewport edges

    // Adjust if it goes off the right edge
    if (finalX + menuWidth > viewportWidth - buffer) {
        finalX = viewportWidth - menuWidth - buffer;
    }

    // Adjust if it goes off the bottom edge
    if (finalY + estimatedMenuHeight > viewportHeight - buffer) {
        finalY = viewportHeight - estimatedMenuHeight - buffer;
    }

    // Ensure it doesn't go off the left edge
    if (finalX < buffer) {
        finalX = buffer;
    }

    // Ensure it doesn't go off the top edge
    if (finalY < buffer) {
        finalY = buffer;
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={onClose}>
            <DropdownMenuContent
                style={{
                    position: 'fixed',
                    top: finalY,
                    left: finalX,
                    maxHeight: `calc(100vh - ${finalY}px - ${buffer}px)`, // Adjust max height based on final position and buffer
                    overflowY: 'auto',
                    minWidth: menuWidth, // Keep previous width control
                    maxWidth: 300, // Keep previous max width control
                }}
                className="custom-scrollbar"
                onCloseAutoFocus={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
            >
                {menuItems.map((item, index) => (
                    <DropdownMenuItem key={index} onClick={item.action}>
                        {item.icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{item.icon}</span>}
                        {item.label}
                        {item.shortcut && <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ContextMenu;