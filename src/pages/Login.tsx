import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { BugIcon, Info, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Login = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('tester');
  const { login, register, isAuthenticated, isLoading: isAuthLoading, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      navigate(`/${currentUser.role}/projects`, { replace: true });
    }
  }, [isAuthenticated, currentUser, navigate]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <BugIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (!success) {
        toast({
          title: "Login failed",
          description: "Invalid username or password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Registration Disabled",
      description: "This platform will allow external users within a few days. It is currently for testing purposes only.",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-2">
            <BugIcon className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">BugRacer</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track bugs, ship faster</p>
        </div>
        
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl sm:text-2xl">{isSignUp ? "Create Account" : "Sign in"}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isSignUp 
                ? "Fill in your details to create a new account" 
                : "Enter your credentials to access your account"
              }
            </CardDescription>
          </CardHeader>
          <form onSubmit={isSignUp ? handleSignUp : handleLogin}>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-1">
                <Label htmlFor="username" className="text-sm">Username</Label>
                <Input 
                  id="username"
                  type="text" 
                  placeholder="Enter Your Username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>
              
              {isSignUp && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input 
                      id="email"
                      type="email" 
                      placeholder="Enter Your Email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="role" className="text-sm">Role</Label>
                    <select
                      id="role"
                      className="w-full h-9 text-sm border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md border px-3"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                      disabled
                    >
                      <option value="tester">Tester</option>
                      <option value="developer">Developer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}
              
              <div className="space-y-1">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              {isSignUp && (
                <Alert variant="default" className="bg-muted/50 text-foreground border-primary/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-xs font-medium">Registration Disabled</AlertTitle>
                  <AlertDescription className="text-xs">
                    This platform will allow external users within a few days. It is currently for testing purposes only.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 pt-2">
              <Button 
                className="w-full h-9 text-sm" 
                type="submit" 
                disabled={isLoading || (isSignUp)}
              >
                {isLoading 
                  ? (isSignUp ? "Creating account..." : "Signing in...") 
                  : (isSignUp ? "Create Account" : "Sign in")
                }
              </Button>
              
              <Button 
                variant="link" 
                type="button"
                className="w-full h-8 text-xs sm:text-sm"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setUsername('');
                  setEmail('');
                  setPassword('');
                  setRole('tester');
                }}
              >
                {isSignUp 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"
                }
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-lg shadow-sm">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-xs sm:text-sm">First time here?</h3>
              <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                Create a new account to start tracking bugs with BugRacer.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Login;
