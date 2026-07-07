import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ENV } from '@/lib/env';
import {
  computeProjectDurationDays,
  formatProjectDate,
  getProjectStatusLabel,
  Project,
} from '@/lib/utils/projectUtils';
import {
  Building2,
  Calendar,
  Clock,
  File,
  Layers,
  Paperclip,
  UserCircle,
  Users,
} from 'lucide-react';

interface ProjectInfoOverviewProps {
  project: Project;
  createdByName?: string;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}

export function ProjectInfoOverview({ project, createdByName }: ProjectInfoOverviewProps) {
  const duration = computeProjectDurationDays(project);
  const members = project.members_detail || [];
  const attachments = project.attachments || [];
  const techStack = project.technology_stack
    ? project.technology_stack.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const leads = members.filter((m) => m.role === 'manager');
  const developers = members.filter((m) => m.role === 'developer');
  const testers = members.filter((m) => m.role === 'tester');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoItem label="Duration" value={`${duration} days`} />
            <InfoItem label="Status" value={getProjectStatusLabel(project.status)} />
            <InfoItem label="Created" value={formatProjectDate(project.created_at)} />
            <InfoItem label="Created By" value={createdByName || 'System'} />
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Project Description</p>
            <p className="text-sm">{project.description?.trim() || 'No description provided.'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Client Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Client" value={project.client_name || '—'} />
          <InfoItem label="Location" value={project.client_location || 'Location not provided'} />
          <InfoItem label="Primary Contact" value={project.client_contact_name || '—'} />
          <InfoItem label="Email" value={project.client_email || '—'} />
          <InfoItem label="Phone" value={project.client_phone || '—'} />
          <InfoItem
            label="Account Status"
            value={project.client_account_status === 'inactive' ? 'Inactive' : 'Active'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Team Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Project Lead</p>
            <p className="text-sm font-medium mt-0.5">
              {leads.length > 0 ? leads.map((m) => m.username).join(', ') : 'Not assigned'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Developers</p>
            <p className="text-sm font-medium mt-0.5">
              {developers.length > 0 ? developers.map((m) => m.username).join(', ') : 'Not assigned'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">QA & Testing</p>
            <p className="text-sm font-medium mt-0.5">
              {testers.length > 0 ? testers.map((m) => m.username).join(', ') : 'Not assigned'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" /> Technology Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          {techStack.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {techStack.map((item) => (
                <Badge key={item} variant="outline">{item}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not specified</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Start Date" value={formatProjectDate(project.start_date)} />
          <InfoItem label="Deadline Date" value={formatProjectDate(project.deadline_date)} />
          <InfoItem label="Expected Publish" value={formatProjectDate(project.expected_publish_date)} />
          <InfoItem label="Testing Start" value={formatProjectDate(project.testing_start_date)} />
          <InfoItem label="Testing End" value={formatProjectDate(project.testing_end_date)} />
          <InfoItem label="Frontend Finish" value={formatProjectDate(project.frontend_finish_date)} />
          <InfoItem label="Backend Finish" value={formatProjectDate(project.backend_finish_date)} />
          <InfoItem label="Duration" value={`${duration} days`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> Attachment Docs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((att) => (
                <a
                  key={att.id}
                  href={`${ENV.API_URL.replace('/api', '')}/${att.file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 text-sm"
                >
                  <File className="h-4 w-4 shrink-0" />
                  <span className="truncate">{att.file_name}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attachments uploaded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
