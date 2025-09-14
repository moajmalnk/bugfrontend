import { BulkMessageSender } from "@/components/ui/BulkMessageSender";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalMessageComposer } from "@/components/ui/ProfessionalMessageComposer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { whatsappMessageService } from "@/services/whatsappMessageService";
import { MessageCircle, Users } from "lucide-react";
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
        {/* Simple Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
              <MessageCircle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Send Messages
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Quick and easy messaging to your team members
          </p>
        </div>

        {/* Main Content */}
        {currentUser?.role !== "admin" ? (
          <div className="max-w-md mx-auto text-center py-12">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Access Restricted</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You need admin permissions to send messages.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Simple Tab Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-8">
              <button
                onClick={() => setActiveTab("single")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === "single"
                    ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                <span>Single</span>
              </button>
              <button
                onClick={() => setActiveTab("bulk")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === "bulk"
                    ? "bg-white dark:bg-gray-700 text-blue-600 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Users className="h-5 w-5" />
                <span>Bulk</span>
              </button>
            </div>

            {/* Single Message */}
            {activeTab === "single" && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
            )}

            {/* Bulk Messages */}
            {activeTab === "bulk" && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
            )}
          </div>
        )}
      </section>
    </main>
  );
}
