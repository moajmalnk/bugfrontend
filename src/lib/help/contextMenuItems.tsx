import {
  BookOpen,
  Bug,
  ExternalLink,
  LifeBuoy,
  ListTodo,
  Mail,
  MousePointer2,
  Plug,
  Rocket,
  Search,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  HELP_CATEGORIES,
  articleMatchesRole,
  getArticleById,
  getArticlesByCategory,
  getHelpRoleFilterForUser,
} from "@/lib/help";

export interface HelpContextMenuActionItem {
  label: string;
  action: () => void | Promise<void>;
  shortcut?: string;
  icon?: LucideIcon;
  disabled?: boolean;
}

export interface HelpContextMenuSection {
  label?: string;
  items: HelpContextMenuActionItem[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Rocket,
  Bug,
  Users,
  ListTodo,
  Plug,
  Shield,
};

const QUICK_GUIDES: {
  id: string;
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  roles?: string[];
}[] = [
  {
    id: "getting-started-overview",
    label: "Getting Started",
    icon: Rocket,
  },
  {
    id: "search-and-shortcuts",
    label: "Search & Shortcuts",
    shortcut: "Ctrl+K",
    icon: Search,
  },
  {
    id: "malayalam-translation",
    label: "Malayalam Translation",
    icon: BookOpen,
  },
  {
    id: "developer-context-menu",
    label: "Context Menu Guide",
    icon: MousePointer2,
    roles: ["developer", "admin"],
  },
];

const HANDBOOK_BY_ROLE: Record<string, { id: string; label: string }> = {
  admin: { id: "admin-handbook", label: "Admin Handbook" },
  developer: { id: "developer-handbook", label: "Developer Handbook" },
  tester: { id: "tester-handbook", label: "Tester Handbook" },
};

export function getHelpContextMenuSections(
  role: string,
  navigate: (path: string) => void,
  onClose: () => void
): HelpContextMenuSection[] {
  const roleFilter = getHelpRoleFilterForUser(role);
  const prefix = `/${role}`;

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const helpItems: HelpContextMenuActionItem[] = [
    {
      label: "Help Center",
      action: () => go(`${prefix}/help`),
      shortcut: "F1",
      icon: LifeBuoy,
    },
  ];

  const handbook = HANDBOOK_BY_ROLE[role];
  if (handbook) {
    const article = getArticleById(handbook.id);
    if (article && articleMatchesRole(article, roleFilter)) {
      helpItems.push({
        label: handbook.label,
        action: () => go(`${prefix}/help/${handbook.id}`),
        icon: BookOpen,
      });
    }
  }

  for (const guide of QUICK_GUIDES) {
    if (guide.roles && !guide.roles.includes(role)) continue;
    const article = getArticleById(guide.id);
    if (!article || !articleMatchesRole(article, roleFilter)) continue;
    helpItems.push({
      label: guide.label,
      action: () => go(`${prefix}/help/${guide.id}`),
      shortcut: guide.shortcut,
      icon: guide.icon,
    });
  }

  const documentationItems: HelpContextMenuActionItem[] = HELP_CATEGORIES.filter(
    (category) => getArticlesByCategory(category.id, roleFilter).length > 0
  ).map((category) => ({
    label: category.title,
    action: () => go(`${prefix}/help?category=${category.id}`),
    icon: CATEGORY_ICONS[category.icon] ?? BookOpen,
  }));

  const supportItems: HelpContextMenuActionItem[] = [
    {
      label: "Email Support",
      action: () => {
        window.location.href = "mailto:support@bugricer.com";
        onClose();
      },
      icon: Mail,
    },
    {
      label: "Visit bugricer.com",
      action: () => {
        window.open("https://bugricer.com", "_blank", "noopener,noreferrer");
        onClose();
      },
      icon: ExternalLink,
    },
  ];

  return [
    { label: "Help", items: helpItems },
    { label: "Documentation", items: documentationItems },
    { label: "Support", items: supportItems },
  ];
}
