import { BulkMessageSender } from "@/components/ui/BulkMessageSender";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalMessageComposer } from "@/components/ui/ProfessionalMessageComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { whatsappMessageService } from "@/services/whatsappMessageService";
import { MessageCircle, Users, Lock } from "lucide-react";
import { useState } from "react";

export default function WhatsAppMessages() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  const handleSendMessage = async (phone: string, message: string) => {
    try {
      await whatsappMessageService.sendCustomMessage(phone, message);
      toast({
        title: "Message Sent",
        description: "WhatsApp message has been sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send WhatsApp message",
        variant: "destructive",
      });
    }
  };

  const handleSendBulkMessage = async (users: any[], message: string) => {
    try {
      const promises = users.map((user) =>
        whatsappMessageService.sendCustomMessage(user.phone, message)
      );

      await Promise.all(promises);

      toast({
        title: "Bulk Message Sent",
        description: `Message sent to ${users.length} recipients successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Bulk Send Failed",
        description: error.message || "Failed to send bulk messages",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
      <section className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Professional Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-green-50/50 via-transparent to-emerald-50/50 dark:from-green-950/20 dark:via-transparent dark:to-emerald-950/20"></div>
          <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent tracking-tight">
                      Messages
                    </h1>
                    <div className="h-1 w-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mt-2"></div>
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg font-medium max-w-2xl">
                  Quick and easy messaging to your team members
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-xl shadow-sm">
                    <div className="p-1.5 bg-green-500 rounded-lg">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        WhatsApp
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentUser?.role !== "admin" ? (
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/50 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-purple-950/20 rounded-2xl"></div>
            <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-12 text-center">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl mb-6">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Access Restricted</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                You need admin permissions to send messages.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Professional Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "single" | "bulk")}
              className="w-full"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/50 to-green-50/50 dark:from-gray-800/50 dark:to-green-900/50 rounded-2xl"></div>
                <div className="relative bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-2">
                  <TabsList className="grid w-full grid-cols-2 h-14 bg-transparent p-1">
                    <TabsTrigger
                      value="single"
                      className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="hidden sm:inline">Single Message</span>
                      <span className="sm:hidden">Single</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="bulk"
                      className="text-sm sm:text-base font-semibold data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200 dark:data-[state=active]:bg-gray-800 dark:data-[state=active]:border-gray-700 rounded-xl transition-all duration-300"
                    >
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      <span className="hidden sm:inline">Bulk Messages</span>
                      <span className="sm:hidden">Bulk</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value={activeTab} className="space-y-6 sm:space-y-8">
                {/* Single Message */}
                {activeTab === "single" && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-green-50/20 dark:from-gray-800/20 dark:to-green-900/20 rounded-2xl"></div>
                    <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-green-50 dark:from-gray-800 dark:to-green-900">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 text-green-500" />
                          Send to One Person
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          Choose a recipient and compose your message
                        </p>
                      </div>
                      <div className="p-6">
                        <ProfessionalMessageComposer
                          onSendMessage={handleSendMessage}
                          showTemplates={true}
                          showBulkSend={false}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Bulk Messages */}
                {activeTab === "bulk" && (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-blue-50/20 dark:from-gray-800/20 dark:to-blue-900/20 rounded-2xl"></div>
                    <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-xl">
                      <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-500" />
                          Send to Multiple People
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          Select recipients and send the same message to all
                        </p>
                      </div>
                      <div className="p-6">
                        <BulkMessageSender
                          onSendBulkMessage={handleSendBulkMessage}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>
    </main>
  );
}
