import { ChatGroupSelector } from "@/components/messaging/ChatGroupSelector";
import { ChatInterface } from "@/components/messaging/ChatInterface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { ChatGroup } from "@/types";
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Hash,
  Phone,
  Video
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Messages = () => {
  const { currentUser } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
  };

  const handleBackToChatList = () => {
    setSelectedGroup(null);
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
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Messages
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Stay connected with your team through real-time messaging and collaboration
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  to={
                    currentUser?.role
                      ? `/${currentUser.role}/messages/new`
                      : "/messages/new"
                  }
                  className="group"
                >
                  <Button
                    variant="default"
                    size="lg"
                    className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group-hover:scale-105"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    New Chat
                  </Button>
                </Link>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        0
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/30 to-blue-50/30 dark:from-gray-800/30 dark:to-blue-900/30 rounded-2xl"></div>
          <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-500 rounded-lg">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search conversations, contacts, or messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Type Filter */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-orange-500 rounded-lg shrink-0">
                      <Filter className="h-4 w-4 text-white" />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[60]">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="group">Group Chats</SelectItem>
                        <SelectItem value="direct">Direct Messages</SelectItem>
                        <SelectItem value="project">Project Channels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-green-500 rounded-lg shrink-0">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[160px] h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[60]">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="offline">Offline</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters Button */}
                  {(searchTerm || typeFilter !== "all" || statusFilter !== "all") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setTypeFilter("all");
                        setStatusFilter("all");
                      }}
                      className="h-11 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 font-medium"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex h-[600px]">
              {/* Chat Group Selector - WhatsApp Sidebar */}
              <aside
                className={cn(
                  "flex flex-col h-full bg-[#111b21] dark:bg-[#111b21] border-r border-[#2a3942] dark:border-[#2a3942] transition-all duration-200",
                  // Mobile: full width when no group selected, hidden when group selected
                  isMobile
                    ? selectedGroup
                      ? "hidden"
                      : "w-full"
                    : "w-full md:w-[400px] lg:w-[420px]"
                )}
              >
                <ChatGroupSelector
                  selectedGroup={selectedGroup}
                  onGroupSelect={handleGroupSelect}
                  showAllProjects={true}
                  onCreateGroupClick={() => {
                    /* open dialog logic here */
                  }}
                />
              </aside>

              {/* Chat Interface - WhatsApp Main Chat */}
              <section
                className={cn(
                  "flex-1 flex flex-col h-full bg-[#0b141a] dark:bg-[#0b141a] transition-all duration-200 overflow-hidden",
                  // Mobile: show only when group selected
                  isMobile
                    ? selectedGroup
                      ? "block w-full"
                      : "hidden"
                    : selectedGroup
                    ? "block"
                    : "flex"
                )}
              >
                {selectedGroup ? (
                  <ChatInterface
                    selectedGroup={selectedGroup}
                    onBackToChatList={handleBackToChatList}
                  />
                ) : (
                  // Professional Empty State
                  <div className="flex-1 flex items-center justify-center bg-[#222e35] dark:bg-[#222e35] border-b-[6px] border-[#00a884]">
                    <div className="text-center max-w-md px-8">
                      <div className="mb-8 relative">
                        <div className="w-[280px] h-[280px] mx-auto rounded-full bg-[#1f2c33] dark:bg-[#1f2c33] flex items-center justify-center shadow-2xl">
                          <MessageCircle className="h-32 w-32 text-[#54656f] dark:text-[#54656f]" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-[#00a884] flex items-center justify-center shadow-xl">
                          <MessageCircle className="h-8 w-8 text-white" fill="white" strokeWidth={0} />
                        </div>
                      </div>
                      <h3 className="text-[32px] font-light mb-6 text-[#e9edef] dark:text-[#e9edef]">
                        BugRicer Messages
                      </h3>
                      <p className="text-sm text-[#8696a0] dark:text-[#8696a0] leading-relaxed mb-8">
                        Send and receive messages with your team members. Stay connected and collaborate in real-time.
                      </p>
                      <div className="space-y-3 text-xs text-[#667781] dark:text-[#667781]">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#00a884]"></div>
                          <span>End-to-end encrypted messages</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#00a884]"></div>
                          <span>Share files, images, and voice notes</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#00a884]"></div>
                          <span>Organize discussions by project</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Messages;
