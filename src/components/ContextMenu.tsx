import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { User } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme } from '@/context/ThemeContext';
import { useSafeNavigate } from '@/hooks/useSafeNavigate';
import { Laptop, Moon, Sun, Folder, Bug, CheckSquare, Users, Settings, User as UserIcon, RefreshCw, Lock, Bell, Rss, PlusSquare, ClipboardCopy, ClipboardPaste, Scissors } from 'lucide-react';

interface ContextMenuItem {
    label: string;
    action: () => void;
    shortcut?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface ContextMenuProps {
    mouseX: number | null;
    mouseY: number | null;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ mouseX, mouseY, onClose }) => {
    const { currentUser } = useAuth();
    const safeNavigate = useSafeNavigate();
    const { toggleTheme, theme } = useTheme();

    // Utilities for clipboard and editable detection
    const getActiveEditable = () => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return null;
        if (active instanceof HTMLInputElement && (active.type === 'text' || active.type === 'search' || active.type === 'url' || active.type === 'tel' || active.type === 'password' || active.type === 'email')) return active;
        if (active instanceof HTMLTextAreaElement) return active;
        if (active.isContentEditable) return active;
        return null;
    };

    const getSelectedText = (): string => {
        const editable = getActiveEditable();
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
            const start = editable.selectionStart ?? 0;
            const end = editable.selectionEnd ?? 0;
            return editable.value.substring(start, end);
        }
        const sel = window.getSelection();
        return sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.toString() : '';
    };

    const canCopy = () => getSelectedText().length > 0;
    const canCut = () => {
        const editable = getActiveEditable();
        return !!editable && getSelectedText().length > 0;
    };
    const canPaste = () => !!getActiveEditable();

    const copyAction = async () => {
        const text = getSelectedText();
        try {
            if (text) {
                await navigator.clipboard.writeText(text);
            } else {
                document.execCommand('copy');
            }
        } catch {
            document.execCommand('copy');
        } finally {
            onClose();
        }
    };

    const cutAction = async () => {
        const editable = getActiveEditable();
        if (!editable) return onClose();
        const text = getSelectedText();
        try {
            if (text) await navigator.clipboard.writeText(text);
        } catch {
            // ignore, we'll still attempt to cut
        }
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
            const start = editable.selectionStart ?? 0;
            const end = editable.selectionEnd ?? 0;
            const before = editable.value.slice(0, start);
            const after = editable.value.slice(end);
            editable.value = before + after;
            const caret = start;
            editable.setSelectionRange(caret, caret);
            editable.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            document.execCommand('cut');
        }
        onClose();
    };

    const insertTextAtCursor = (text: string) => {
        const editable = getActiveEditable();
        if (!editable) return;
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
            const start = editable.selectionStart ?? editable.value.length;
            const end = editable.selectionEnd ?? editable.value.length;
            const before = editable.value.slice(0, start);
            const after = editable.value.slice(end);
            editable.value = before + text + after;
            const caret = start + text.length;
            editable.setSelectionRange(caret, caret);
            editable.dispatchEvent(new Event('input', { bubbles: true }));
            editable.focus();
        } else {
            // contenteditable
            if (!document.execCommand('insertText', false, text)) {
                const sel = window.getSelection();
                if (!sel) return;
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(text));
                range.collapse(false);
            }
        }
    };

    const pasteAction = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) insertTextAtCursor(text);
        } catch {
            // Fallback: attempt execCommand paste (may be blocked by browser)
            document.execCommand('paste');
        } finally {
            onClose();
        }
    };

    // Define menu items based on user role
    const getMenuItems = (role: User['role'] | undefined): ContextMenuItem[] => {
        const commonItems: ContextMenuItem[] = [
            { label: 'Copy', action: copyAction, icon: <ClipboardCopy className="h-4 w-4" />, shortcut: 'Ctrl+C', disabled: !canCopy() },
            { label: 'Cut', action: cutAction, icon: <Scissors className="h-4 w-4" />, shortcut: 'Ctrl+X', disabled: !canCut() },
            { label: 'Paste', action: pasteAction, icon: <ClipboardPaste className="h-4 w-4" />, shortcut: 'Ctrl+V', disabled: !canPaste() },
            { label: 'Privacy Mode', action: () => { /* TODO: Implement privacy mode toggle */ onClose(); }, shortcut: 'Ctrl+Space', icon: <Lock className="h-4 w-4" /> },
            { label: 'Profile', action: () => { safeNavigate(`/${role}/profile`); onClose(); }, icon: <UserIcon className="h-4 w-4" />, shortcut: 'Ctrl+Shift+P' },
            { label: 'Refresh', action: () => { window.location.reload(); onClose(); }, icon: <RefreshCw className="h-4 w-4" />, shortcut: 'Ctrl+R' },
            { label: 'Dark or Light', action: () => { toggleTheme(); onClose(); }, shortcut: 'Shift+Space', icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" /> },
        ];

        if (role === 'admin') {
            return [
                { label: 'New Bug', action: () => { safeNavigate(`/${role}/bugs/new`); onClose(); }, shortcut: 'Ctrl+B', icon: <Bug className="h-4 w-4" /> },
                { label: 'Fix Bugs', action: () => { safeNavigate(`/${role}/bugs`); onClose(); }, shortcut: 'Ctrl+Shift+F', icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'New Update', action: () => { safeNavigate(`/${role}/new-update`); onClose(); }, shortcut: 'Ctrl+U', icon: <PlusSquare className="h-4 w-4" /> },
                { label: 'Projects', action: () => { safeNavigate(`/${role}/projects`); onClose(); }, icon: <Folder className="h-4 w-4" /> },
                { label: 'Bugs', action: () => { safeNavigate(`/${role}/bugs`); onClose(); }, icon: <Bug className="h-4 w-4" />, shortcut: 'Ctrl+Shift+B' },
                { label: 'Fixes', action: () => { safeNavigate(`/${role}/fixes`); onClose(); }, shortcut: 'Ctrl+Shift+F', icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'Updates', action: () => { safeNavigate(`/${role}/updates`); onClose(); }, shortcut: 'Ctrl+Shift+U', icon: <Rss className="h-4 w-4" /> },
                { label: 'Users', action: () => { safeNavigate(`/${role}/users`); onClose(); }, icon: <Users className="h-4 w-4" /> },
                { label: 'Settings', action: () => { safeNavigate(`/${role}/settings`); onClose(); }, icon: <Settings className="h-4 w-4" />, shortcut: 'Ctrl+Shift+S' },
                ...commonItems,
            ];
        } else if (role === 'developer') {
            return [
                { label: 'Fixes', action: () => { safeNavigate(`/${role}/fixes`); onClose(); }, icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'Fix Bugs', action: () => { safeNavigate(`/${role}/bugs`); onClose(); }, shortcut: 'Ctrl+Shift+F', icon: <CheckSquare className="h-4 w-4" /> },
                { label: 'New Update', action: () => { safeNavigate(`/${role}/new-update`); onClose(); }, shortcut: 'Ctrl+U', icon: <PlusSquare className="h-4 w-4" /> },
                { label: 'Updates', action: () => { safeNavigate(`/${role}/updates`); onClose(); }, shortcut: 'Ctrl+Shift+U', icon: <Rss className="h-4 w-4" /> },
                ...commonItems,
            ];
        } else if (role === 'tester') {
            return [
                { label: 'Bugs', action: () => { safeNavigate(`/${role}/bugs`); onClose(); }, icon: <Bug className="h-4 w-4" />, shortcut: 'Ctrl+Shift+B' },
                { label: 'New Bug', action: () => { safeNavigate(`/${role}/bugs/new`); onClose(); }, shortcut: 'Ctrl+B', icon: <Bug className="h-4 w-4" /> },
                { label: 'New Update', action: () => { safeNavigate(`/${role}/new-update`); onClose(); }, shortcut: 'Ctrl+U', icon: <PlusSquare className="h-4 w-4" /> },
                { label: 'Updates', action: () => { safeNavigate(`/${role}/updates`); onClose(); }, shortcut: 'Ctrl+Shift+U', icon: <Rss className="h-4 w-4" /> },
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
                    <React.Fragment key={index}>
                        <DropdownMenuItem onClick={item.action} disabled={item.disabled}>
                            {item.icon && <span className="mr-2 flex h-4 w-4 items-center justify-center">{item.icon}</span>}
                            {item.label}
                            {item.shortcut && <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>}
                        </DropdownMenuItem>
                        {index === 2 && <DropdownMenuSeparator />}
                    </React.Fragment>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ContextMenu;