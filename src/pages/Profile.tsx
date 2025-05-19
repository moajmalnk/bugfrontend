
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Mail, MapPin, Link as LinkIcon, Github, Linkedin } from 'lucide-react';

export default function Profile() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
        <div className="w-32 h-32 rounded-full overflow-hidden">
          <img
            src="https://codoacademy.com/uploads/system/e7c3fb5390c74909db1bb3559b24007a.png"
            alt={currentUser.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold mb-2">{currentUser.name}</h1>
          <p className="text-muted-foreground mb-4">{currentUser.role}</p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              {currentUser.email}
            </Button>
            <Button variant="outline" size="sm">
              <MapPin className="w-4 h-4 mr-2" />
              CODO AI Innovations
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* About Section */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Experienced {currentUser.role} specializing in bug tracking and project management.
              Passionate about creating efficient and user-friendly solutions.
            </p>
          </CardContent>
        </Card>

        {/* Links Section */}
        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href="#" className="flex items-center text-muted-foreground hover:text-primary">
              <Github className="w-4 h-4 mr-2" />
              Github
            </a>
            <a href="#" className="flex items-center text-muted-foreground hover:text-primary">
              <Linkedin className="w-4 h-4 mr-2" />
              LinkedIn
            </a>
            <a href="#" className="flex items-center text-muted-foreground hover:text-primary">
              <LinkIcon className="w-4 h-4 mr-2" />
              Portfolio
            </a>
          </CardContent>
        </Card>

        {/* Activity Section */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">Updated bug #{i + 1000}</p>
                    <p className="text-sm text-muted-foreground">
                      Changed status to "In Progress"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
