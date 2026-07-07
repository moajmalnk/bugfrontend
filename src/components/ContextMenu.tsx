import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/components/ui/use-toast';
import { translateToMalayalam } from '@/lib/malayalamUtils';
import { getHelpContextMenuSections } from '@/lib/help/contextMenuItems';
import {
    Moon,
    Sun,
    Folder,
    FolderPlus,
    Bug,
    CheckSquare,
    Users,
    Settings,
    User as UserIcon,
    RefreshCw,
    Lock,
    Rss,
    PlusSquare,
    ClipboardCopy,
    ClipboardPaste,
    Scissors,
} from 'lucide-react';

interface ContextMenuActionItem {
    label: string;
    action: () => void | Promise<void>;
    shortcut?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

interface MenuSection {
    label?: string;
    items: ContextMenuActionItem[];
}

interface ContextMenuProps {
    mouseX: number | null;
    mouseY: number | null;
    onClose: () => void;
}

const MalayalamBadge = () => (
    <span
        className="text-[11px] font-bold leading-none text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded px-1 py-0.5"
        aria-hidden="true"
    >
        മ
    </span>
);

const ContextMenu: React.FC<ContextMenuProps> = ({ mouseX, mouseY, onClose }) => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { toggleTheme, theme } = useTheme();

    const getActiveEditable = () => {
        const active = document.activeElement as HTMLElement | null;
        if (!active) return null;
        if (
            active instanceof HTMLInputElement &&
            ['text', 'search', 'url', 'tel', 'password', 'email'].includes(active.type)
        ) {
            return active;
        }
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

    const selectedText = getSelectedText();
    const hasSelection = selectedText.trim().length > 0;

    const canCopy = () => hasSelection;
    const canCut = () => !!getActiveEditable() && hasSelection;
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
        } else if (!document.execCommand('insertText', false, text)) {
            const sel = window.getSelection();
            if (!sel) return;
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
        }
    };

    const pasteAction = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) insertTextAtCursor(text);
        } catch {
            document.execCommand('paste');
        } finally {
            onClose();
        }
    };

    const replaceSelectedText = (replacement: string) => {
        const editable = getActiveEditable();
        if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
            const start = editable.selectionStart ?? 0;
            const end = editable.selectionEnd ?? 0;
            const before = editable.value.slice(0, start);
            const after = editable.value.slice(end);
            editable.value = before + replacement + after;
            const caret = start + replacement.length;
            editable.setSelectionRange(caret, caret);
            editable.dispatchEvent(new Event('input', { bubbles: true }));
            editable.focus();
            return;
        }

        if (editable?.isContentEditable) {
            if (!document.execCommand('insertText', false, replacement)) {
                const sel = window.getSelection();
                if (!sel?.rangeCount) return;
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(replacement));
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            editable.focus();
            return;
        }

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        range.deleteContents();

        const translatedNode = document.createElement('span');
        translatedNode.textContent = replacement;
        translatedNode.setAttribute('data-translated', 'ml');
        translatedNode.className =
            'translated-ml bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded px-0.5';
        range.insertNode(translatedNode);

        range.setStartAfter(translatedNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    };

    const translateAction = async () => {
        const text = getSelectedText().trim();
        if (!text) {
            onClose();
            return;
        }

        try {
            const translated = await translateToMalayalam(text);
            replaceSelectedText(translated);
        } catch {
            toast({
                title: 'Translation failed',
                description: 'Could not translate the selected text. Please try again.',
                variant: 'destructive',
            });
        } finally {
            onClose();
        }
    };

    const safeNavigate = (path: string) => {
        if (import.meta.env.PROD && window.location.pathname.includes('/bugs/')) {
            window.location.href = path;
        } else {
            navigate(path);
        }
        onClose();
    };

    const getMenuSections = (role: User['role'] | undefined): MenuSection[] => {
        const clipboardItems: ContextMenuActionItem[] = [
            {
                label: 'Copy',
                action: copyAction,
                icon: <ClipboardCopy className="h-4 w-4" />,
                shortcut: 'Ctrl+C',
                disabled: !canCopy(),
            },
            {
                label: 'Cut',
                action: cutAction,
                icon: <Scissors className="h-4 w-4" />,
                shortcut: 'Ctrl+X',
                disabled: !canCut(),
            },
            {
                label: 'Paste',
                action: pasteAction,
                icon: <ClipboardPaste className="h-4 w-4" />,
                shortcut: 'Ctrl+V',
                disabled: !canPaste(),
            },
        ];

        if (hasSelection) {
            clipboardItems.push({
                label: 'Translate',
                action: translateAction,
                icon: <MalayalamBadge />,
            });
        }

        const appSection: MenuSection = {
            label: 'App',
            items: [
                {
                    label: 'Privacy Mode',
                    action: () => onClose(),
                    shortcut: 'Ctrl+Space',
                    icon: <Lock className="h-4 w-4" />,
                },
                {
                    label: 'Profile',
                    action: () => safeNavigate(`/${role}/profile`),
                    icon: <UserIcon className="h-4 w-4" />,
                    shortcut: 'Ctrl+Shift+P',
                },
                {
                    label: 'Refresh',
                    action: () => {
                        window.location.reload();
                        onClose();
                    },
                    icon: <RefreshCw className="h-4 w-4" />,
                    shortcut: 'Ctrl+R',
                },
                {
                    label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
                    action: () => {
                        toggleTheme();
                        onClose();
                    },
                    shortcut: 'Shift+Space',
                    icon:
                        theme === 'dark' ? (
                            <Sun className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        ),
                },
            ],
        };

    const helpSections: MenuSection[] = getHelpContextMenuSections(
        role || 'user',
        safeNavigate,
        onClose
    ).map((section) => ({
        ...section,
        items: section.items.map((item) => ({
            ...item,
            icon: item.icon ? <item.icon className="h-4 w-4" /> : undefined,
        })),
    }));

    if (role === 'admin') {
            return [
                {
                    label: 'Create',
                    items: [
                        {
                            label: 'New Bug',
                            action: () => safeNavigate(`/${role}/bugs/new`),
                            shortcut: 'Ctrl+B',
                            icon: <Bug className="h-4 w-4" />,
                        },
                        {
                            label: 'New Project',
                            action: () => safeNavigate(`/${role}/projects/new`),
                            icon: <FolderPlus className="h-4 w-4" />,
                        },
                        {
                            label: 'New Update',
                            action: () => safeNavigate(`/${role}/new-update`),
                            shortcut: 'Ctrl+U',
                            icon: <PlusSquare className="h-4 w-4" />,
                        },
                        {
                            label: 'Fix Bugs',
                            action: () => safeNavigate(`/${role}/bugs`),
                            shortcut: 'Ctrl+Shift+F',
                            icon: <CheckSquare className="h-4 w-4" />,
                        },
                    ],
                },
                {
                    label: 'Navigate',
                    items: [
                        {
                            label: 'Projects',
                            action: () => safeNavigate(`/${role}/projects`),
                            icon: <Folder className="h-4 w-4" />,
                        },
                        {
                            label: 'Bugs',
                            action: () => safeNavigate(`/${role}/bugs`),
                            icon: <Bug className="h-4 w-4" />,
                            shortcut: 'Ctrl+Shift+B',
                        },
                        {
                            label: 'Fixes',
                            action: () => safeNavigate(`/${role}/fixes`),
                            icon: <CheckSquare className="h-4 w-4" />,
                        },
                        {
                            label: 'Updates',
                            action: () => safeNavigate(`/${role}/updates`),
                            shortcut: 'Ctrl+Shift+U',
                            icon: <Rss className="h-4 w-4" />,
                        },
                        {
                            label: 'Users',
                            action: () => safeNavigate(`/${role}/users`),
                            icon: <Users className="h-4 w-4" />,
                        },
                        {
                            label: 'Settings',
                            action: () => safeNavigate(`/${role}/settings`),
                            icon: <Settings className="h-4 w-4" />,
                            shortcut: 'Ctrl+Shift+S',
                        },
                    ],
                },
                { label: 'Clipboard', items: clipboardItems },
                ...helpSections,
                appSection,
            ];
        }

        if (role === 'developer') {
            return [
                {
                    label: 'Create',
                    items: [
                        {
                            label: 'New Bug',
                            action: () => safeNavigate(`/${role}/bugs/new`),
                            shortcut: 'Ctrl+B',
                            icon: <Bug className="h-4 w-4" />,
                        },
                        {
                            label: 'New Update',
                            action: () => safeNavigate(`/${role}/new-update`),
                            shortcut: 'Ctrl+U',
                            icon: <PlusSquare className="h-4 w-4" />,
                        },
                        {
                            label: 'Fix Bugs',
                            action: () => safeNavigate(`/${role}/bugs`),
                            shortcut: 'Ctrl+Shift+F',
                            icon: <CheckSquare className="h-4 w-4" />,
                        },
                    ],
                },
                {
                    label: 'Navigate',
                    items: [
                        {
                            label: 'Fixes',
                            action: () => safeNavigate(`/${role}/fixes`),
                            icon: <CheckSquare className="h-4 w-4" />,
                        },
                        {
                            label: 'Updates',
                            action: () => safeNavigate(`/${role}/updates`),
                            shortcut: 'Ctrl+Shift+U',
                            icon: <Rss className="h-4 w-4" />,
                        },
                    ],
                },
                { label: 'Clipboard', items: clipboardItems },
                ...helpSections,
                appSection,
            ];
        }

        if (role === 'tester') {
            return [
                {
                    label: 'Create',
                    items: [
                        {
                            label: 'New Bug',
                            action: () => safeNavigate(`/${role}/bugs/new`),
                            shortcut: 'Ctrl+B',
                            icon: <Bug className="h-4 w-4" />,
                        },
                        {
                            label: 'New Update',
                            action: () => safeNavigate(`/${role}/new-update`),
                            shortcut: 'Ctrl+U',
                            icon: <PlusSquare className="h-4 w-4" />,
                        },
                    ],
                },
                {
                    label: 'Navigate',
                    items: [
                        {
                            label: 'Bugs',
                            action: () => safeNavigate(`/${role}/bugs`),
                            icon: <Bug className="h-4 w-4" />,
                            shortcut: 'Ctrl+Shift+B',
                        },
                        {
                            label: 'Updates',
                            action: () => safeNavigate(`/${role}/updates`),
                            shortcut: 'Ctrl+Shift+U',
                            icon: <Rss className="h-4 w-4" />,
                        },
                    ],
                },
                { label: 'Clipboard', items: clipboardItems },
                ...helpSections,
                appSection,
            ];
        }

        return [{ label: 'Clipboard', items: clipboardItems }, ...helpSections, appSection];
    };

    const menuSections = getMenuSections(currentUser?.role);

    const isOpen = mouseX !== null && mouseY !== null;
    const itemCount = menuSections.reduce((sum, section) => sum + section.items.length, 0);

    if (!isOpen || itemCount === 0) {
        return null;
    }

    const menuWidth = 300;
    const estimatedMenuHeight = itemCount * 36 + menuSections.length * 28 + 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const buffer = 10;

    let finalX = mouseX || 0;
    let finalY = mouseY || 0;

    if (finalX + menuWidth > viewportWidth - buffer) {
        finalX = viewportWidth - menuWidth - buffer;
    }
    if (finalY + estimatedMenuHeight > viewportHeight - buffer) {
        finalY = viewportHeight - estimatedMenuHeight - buffer;
    }
    if (finalX < buffer) finalX = buffer;
    if (finalY < buffer) finalY = buffer;

    return (
        <DropdownMenu open={isOpen} onOpenChange={onClose}>
            <DropdownMenuContent
                data-context-menu-root
                style={{
                    position: 'fixed',
                    top: finalY,
                    left: finalX,
                    maxHeight: `calc(100vh - ${finalY}px - ${buffer}px)`,
                    overflowY: 'auto',
                    minWidth: menuWidth,
                    maxWidth: 320,
                }}
                className="custom-scrollbar p-1.5"
                onCloseAutoFocus={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
            >
                {menuSections.map((section, sectionIndex) => (
                    <React.Fragment key={section.label ?? sectionIndex}>
                        {sectionIndex > 0 && <DropdownMenuSeparator className="my-1.5" />}
                        {section.label && (
                            <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {section.label}
                            </DropdownMenuLabel>
                        )}
                        {section.items.map((item) => (
                            <DropdownMenuItem
                                key={item.label}
                                onClick={item.action}
                                disabled={item.disabled}
                                className="gap-2 rounded-md px-2 py-2 text-sm focus:bg-accent/80 data-[disabled]:opacity-40"
                            >
                                {item.icon && (
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                                        {item.icon}
                                    </span>
                                )}
                                <span className="flex-1 truncate">{item.label}</span>
                                {item.shortcut && (
                                    <span className="ml-2 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                        {item.shortcut}
                                    </span>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </React.Fragment>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default ContextMenu;
