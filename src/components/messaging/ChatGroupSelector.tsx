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
  projectId?: string;
}

export const ChatGroupSelector: React.FC<ChatGroupSelectorProps> = ({
  selectedGroup,
  onGroupSelect,
  projectId
}) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (selectedProjectId) {
      loadGroups();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectsData = await projectService.getProjects();
      setProjects(projectsData as unknown as Project[]);
      if (!selectedProjectId && projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive"
      });
    }
  };

  const loadGroups = async () => {
    if (!selectedProjectId) return;
    
    setIsLoading(true);
    try {
      const groupsData = await MessagingService.getGroupsByProject(selectedProjectId);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast({
        title: "Error",
        description: "Failed to load chat groups",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!selectedProjectId || !createForm.name.trim()) {
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
        project_id: selectedProjectId
      });

      setGroups(prev => [newGroup, ...prev]);
      setCreateForm({ name: '', description: '' });
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
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Mobile Header - Only show on mobile */}
      <div className="md:hidden sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <h1 className="text-xl font-bold">Chats</h1>
      </div>

      {/* Desktop Header - Only show on desktop */}
      <div className="hidden md:block sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 pt-4 pb-2">
        <h2 className="text-lg font-semibold mb-3">Chat Groups</h2>
        <div className="space-y-2">
          <Label htmlFor="project-select" className="text-sm">Select Project</Label>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
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
        {isAdmin && selectedProjectId && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-3" disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Group
              </Button>
            </DialogTrigger>
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
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGroup} disabled={isLoading || !createForm.name.trim()}>
                    Create Group
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

      {/* Project Selector - Mobile */}
      <div className="md:hidden sticky top-28 z-10 bg-background/95 backdrop-blur border-b px-4 py-2">
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="bg-muted/50 border-0">
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
        {isAdmin && selectedProjectId && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full mt-2" size="sm" disabled={isLoading}>
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
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
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGroup} disabled={isLoading || !createForm.name.trim()}>
                    Create Group
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Scrollable Groups List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-0 bg-background">
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
                {searchQuery ? 'No groups found' : 'No chat groups found for this project'}
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
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {formatLastMessageTime(group.last_message_at)}
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
    </div>
  );
}; 