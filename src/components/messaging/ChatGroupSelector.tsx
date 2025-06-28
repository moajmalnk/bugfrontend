import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageCircle, Users, Clock, Trash2, Edit } from 'lucide-react';
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky Project Selector & Create Button */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 pt-4 pb-2">
        <div className="space-y-2">
          <Label htmlFor="project-select">Select Project</Label>
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

      {/* Scrollable Groups List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-4 space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
        <h3 className="text-sm font-medium text-muted-foreground px-2">Chat Groups</h3>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No chat groups found for this project
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <Card
                key={group.id}
                className={`cursor-pointer transition-all border-2 ${
                  selectedGroup?.id === group.id
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-transparent hover:bg-muted/60 hover:shadow-md'
                }`}
                onClick={() => onGroupSelect(group)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onGroupSelect(group); }}
                aria-selected={selectedGroup?.id === group.id}
              >
                <CardContent className="p-4 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium truncate">{group.name}</h4>
                      {!group.is_member && (
                        <Badge variant="secondary" className="text-xs">
                          Not Member
                        </Badge>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{group.member_count} members</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastMessageTime(group.last_message_at)}</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement edit functionality
                        }}
                        tabIndex={-1}
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
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 