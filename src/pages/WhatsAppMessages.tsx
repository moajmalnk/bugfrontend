import { BulkMessageSender } from "@/components/ui/BulkMessageSender";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalMessageComposer } from "@/components/ui/ProfessionalMessageComposer";
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
                <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                <span className="break-words">WhatsApp Message Center</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Send WhatsApp messages to users with professional templates
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {currentUser?.role !== "admin" ? (
          <Card className="p-4 sm:p-6 lg:p-8 text-center">
            <div className="max-w-md mx-auto">
              <p className="text-muted-foreground text-sm sm:text-base">
                You do not have permission to view this page.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Tab Navigation */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 border-b border-border">
              <Button
                variant={activeTab === "single" ? "default" : "ghost"}
                onClick={() => setActiveTab("single")}
                className="flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base flex-1 sm:flex-none"
              >
                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Single Message</span>
              </Button>
              <Button
                variant={activeTab === "bulk" ? "default" : "ghost"}
                onClick={() => setActiveTab("bulk")}
                className="flex items-center justify-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base flex-1 sm:flex-none"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">Bulk Messages</span>
              </Button>
            </div>

            {/* Single Message Tab */}
            {activeTab === "single" && (
              <Card className="w-full">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl">
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
                    <span>Send Single Message</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="max-w-4xl mx-auto">
                    <ProfessionalMessageComposer
                      onSendMessage={handleSendMessage}
                      showTemplates={true}
                      showBulkSend={false}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Messages Tab */}
            {activeTab === "bulk" && (
              <Card className="w-full">
                <CardHeader className="pb-4 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl lg:text-2xl">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                    <span>Send Bulk Messages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 lg:p-8">
                  <div className="max-w-6xl mx-auto">
                    <BulkMessageSender
                      onSendBulkMessage={handleSendBulkMessage}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
