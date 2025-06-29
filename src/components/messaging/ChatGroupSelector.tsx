import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, MessageCircle, Users, Clock, Trash2, Edit, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MessagingService } from '@/services/messagingService';
import { projectService } from '@/services/projectService';
import { ChatGroup, Project } from '@/types';

interface ChatGroupSelectorProps {
  selectedGroup: ChatGroup | null;
  onGroupSelect: (group: ChatGroup) => void;
  showAllProjects?: boolean;
  onCreateGroupClick?: () => void;
}

export const ChatGroupSelector: React.FC<ChatGroupSelectorProps> = ({
  selectedGroup,
  onGroupSelect,
  showAllProjects = false,
  onCreateGroupClick
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    projectId: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    // Always load all projects and all groups
    (async () => {
    setIsLoading(true);
    try {
        const allProjects = await projectService.getProjects();
        setProjects(allProjects as unknown as Project[]);
        let allGroups: ChatGroup[] = [];
        for (const project of allProjects) {
          const groups = await MessagingService.getGroupsByProject(project.id);
          allGroups = allGroups.concat(groups.map(g => ({ ...g, projectName: project.name, projectId: project.id })));
        }
        setGroups(allGroups);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chat groups",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
    })();
  }, []);

  const handleCreateGroup = async () => {
    if (!createForm.projectId || !createForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const newGroup = await MessagingService.createGroup({
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        project_id: createForm.projectId
      });
      setGroups(prev => [
        { ...newGroup, projectName: projects.find(p => p.id === createForm.projectId)?.name, projectId: createForm.projectId },
        ...prev
      ]);
      setCreateForm({ name: '', description: '', projectId: '' });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Chat group created successfully"
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create chat group",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this chat group?')) return;

    setIsLoading(true);
    try {
      await MessagingService.deleteGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      
      if (selectedGroup?.id === groupId) {
        onGroupSelect(null);
      }
      
      toast({
        title: "Success",
        description: "Chat group deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat group",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return 'No messages yet';
    return MessagingService.formatMessageTime(timestamp);
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background overflow-hidden">
      {/* Header with plus button */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">Chat Groups</h2>
        {isAdmin && (
          <Button size="icon" variant="default" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-5 w-5" />
                  </Button>
        )}
      </div>
      {/* Search Bar - Mobile */}
      <div className="md:hidden sticky top-16 z-10 bg-background/95 backdrop-blur border-b px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus:bg-background"
          />
        </div>
      </div>
      {/* Scrollable Groups List */}
      <div className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto overflow-x-hidden space-y-0 bg-background hide-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm">Loading groups...</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No groups found' : 'No chat groups found'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedGroup?.id === group.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                }`}
                onClick={() => onGroupSelect(group)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onGroupSelect(group); }}
                aria-selected={selectedGroup?.id === group.id}
              >
                {/* Group Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {group.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Group Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium truncate text-sm">{group.name}</h4>
                    <span className="text-xs text-primary font-semibold flex-shrink-0 ml-2">
                      {group.projectName}
                    </span>
                  </div>
                  {group.description && (
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                      {group.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{group.member_count}</span>
                    </div>
                    {!group.is_member && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Not Member
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Admin Actions - Desktop only */}
                {isAdmin && (
                  <div className="hidden md:flex items-center space-x-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement edit functionality
                      }}
                      tabIndex={-1}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                      tabIndex={-1}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Create Group Dialog with project dropdown inside */}
      {isAdmin && (
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Chat Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="group-name">Group Name *</Label>
                <Input
                  id="group-name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <Label htmlFor="group-description">Description</Label>
                <Textarea
                  id="group-description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter group description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="project-select">Select Project *</Label>
                <Select
                  value={createForm.projectId}
                  onValueChange={val => setCreateForm(prev => ({ ...prev, projectId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup} disabled={isLoading || !createForm.name.trim() || !createForm.projectId}>
                  Create Group
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 