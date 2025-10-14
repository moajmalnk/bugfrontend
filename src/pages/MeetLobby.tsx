import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMeeting, getMeeting } from "@/services/meetings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Video, Users, Copy, Check, Plus } from "lucide-react";
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
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      BugMeet
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Professional video meetings for your development team
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      Live
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50 rounded-2xl p-6">
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <AlertDescription className="text-red-800 dark:text-red-300">{error}</AlertDescription>
              </Alert>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Create Meeting */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-4">
                  <Video className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Start a new meeting</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Title
                  </label>
                  <Input 
                    placeholder="Enter meeting title" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-5 w-5" />
                      Create Meeting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Join Meeting */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg mr-4">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">Join with code</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Code
                  </label>
                  <Input 
                    placeholder="Enter meeting code" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-mono text-center text-lg tracking-wider"
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleJoin} 
                  disabled={loading || !code.trim()}
                  className="w-full h-12 bg-white dark:bg-gray-800 border-green-600 dark:border-green-700 text-green-600 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-700 dark:hover:border-green-600 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-5 w-5" />
                      Join Meeting
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Features Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Professional Meeting Features
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl mx-auto">
                Everything you need for productive team collaboration
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-blue-50/50 dark:from-purple-950/20 dark:via-transparent dark:to-blue-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl w-fit mx-auto mb-4 shadow-lg">
                    <Video className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">HD Video Quality</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Crystal clear video quality for seamless communication</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-transparent to-red-50/50 dark:from-orange-950/20 dark:via-transparent dark:to-red-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl w-fit mx-auto mb-4 shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">Team Collaboration</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Work together seamlessly with your development team</p>
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl w-fit mx-auto mb-4 shadow-lg">
                    <Copy className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-lg">Easy Sharing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Share meeting codes instantly with your team members</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


