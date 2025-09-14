import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMeeting, getMeeting } from "@/services/meetings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Video, Users, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function MeetLobby() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await createMeeting(title || "BugMeet");
      const data = res.data as any;
      if (data?.success && data?.data?.code) {
        toast.success("Meeting created successfully!");
        navigate(`./${data.data.code}`);
      } else {
        setError(data?.message || "Failed to create meeting");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create meeting");
      toast.error("Failed to create meeting");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("Please enter a meeting code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getMeeting(code.toUpperCase());
      const data = res.data as any;
      if (data?.success) {
        toast.success("Joining meeting...");
        navigate(`./${code.toUpperCase()}`);
      } else {
        setError(data?.message || "Meeting not found");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to join meeting");
      toast.error("Failed to join meeting");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Video className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">BugMeet</h1>
          </div>
          <p className="text-gray-600 text-lg">Professional video meetings for your team</p>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Meeting */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <Video className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Start a new meeting</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Title
                </label>
                <Input 
                  placeholder="Enter meeting title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button 
                onClick={handleCreate} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Create Meeting
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Join Meeting */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Join with code</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Code
                </label>
                <Input 
                  placeholder="Enter meeting code" 
                  value={code} 
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full font-mono text-center text-lg tracking-wider"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={handleJoin} 
                disabled={loading || !code.trim()}
                className="w-full border-green-600 text-green-600 hover:bg-green-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Join Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">HD Video</h3>
            <p className="text-sm text-gray-600">Crystal clear video quality</p>
          </div>
          <div className="text-center">
            <div className="p-3 bg-orange-100 rounded-lg w-fit mx-auto mb-3">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Team Collaboration</h3>
            <p className="text-sm text-gray-600">Work together seamlessly</p>
          </div>
          <div className="text-center">
            <div className="p-3 bg-green-100 rounded-lg w-fit mx-auto mb-3">
              <Copy className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Easy Sharing</h3>
            <p className="text-sm text-gray-600">Share codes instantly</p>
          </div>
        </div>
      </div>
    </div>
  );
}


