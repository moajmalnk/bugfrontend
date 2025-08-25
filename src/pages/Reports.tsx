import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";
import { bugStore, userStore } from "@/lib/store";
import { formatLocalDate } from "@/lib/utils/dateUtils";
import { Bug, User } from "@/types";
import { jsPDF } from "jspdf";
import { default as autoTable } from "jspdf-autotable";
import { FileIcon, FileText } from "lucide-react";
import { useEffect, useState } from "react";

// Helper function to export table data to CSV
const exportToCsv = (filename: string, rows: any[]) => {
  const processRow = (row: any) => {
    let finalVal = "";
    for (let j = 0; j < row.length; j++) {
      let value = row[j] === null ? "" : row[j].toString();
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      if (j > 0) finalVal += ",";
      finalVal += value;
    }
    return finalVal + "\n";
  };

  let csvFile = "";
  for (let i = 0; i < rows.length; i++) {
    csvFile += processRow(rows[i]);
  }

  const blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper function to prepare data for export
const prepareUserBugData = (users: User[], bugs: Bug[], role: string) => {
  // Filter users by role
  const filteredUsers = users.filter((user) => user.role === role);

  // Create a map of user IDs to their bug counts
  const userBugCounts = filteredUsers.map((user) => {
    const userBugs = bugs.filter((bug) => bug.reported_by === user.id);
    const pendingBugs = userBugs.filter(
      (bug) => bug.status === "pending"
    ).length;
    const fixedBugs = userBugs.filter((bug) => bug.status === "fixed").length;
    const totalBugs = userBugs.length;

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      pendingBugs,
      fixedBugs,
      totalBugs,
    };
  });

  return userBugCounts;
};

export default function Reports() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await userStore.getUsers();
        const fetchedBugs = await bugStore.getBugs();
        setUsers(fetchedUsers);
        setBugs(fetchedBugs);
      } catch (error) {
        // console.error('Failed to load report data:', error);
        toast({
          title: "Error",
          description: "Failed to load report data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const exportToPdf = (data: any[], title: string) => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(title, 20, 20);

      // Add current date
      doc.setFontSize(10);
      doc.text(`Generated on: ${formatLocalDate(new Date(), "date")}`, 20, 30);

      // Define table columns
      const columns = [
        "Name",
        "Email",
        "Pending Bugs",
        "Fixed Bugs",
        "Total Bugs",
      ];

      // Create data rows from our data
      const rows = data.map((item) => [
        item.name,
        item.email,
        item.pendingBugs.toString(),
        item.fixedBugs.toString(),
        item.totalBugs.toString(),
      ]);

      // Add table with jspdf-autotable
      autoTable(doc, {
        head: [columns],
        body: rows,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 66, 66] },
      });

      // Save the PDF
      doc.save(
        `${title.toLowerCase().replace(/\s+/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }.pdf`
      );

      toast({
        title: "Success",
        description: "PDF has been generated successfully.",
      });
    } catch (error) {
      // console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportToCsvFile = (data: any[], filename: string) => {
    try {
      // Define headers
      const headers = [
        "Name",
        "Email",
        "Role",
        "Pending Bugs",
        "Fixed Bugs",
        "Total Bugs",
      ];

      // Create rows with header and data
      const rows = [
        headers,
        ...data.map((item) => [
          item.name,
          item.email,
          item.role,
          item.pendingBugs,
          item.fixedBugs,
          item.totalBugs,
        ]),
      ];

      // Export to CSV
      exportToCsv(
        `${filename.toLowerCase().replace(/\s+/g, "-")}-${
          new Date().toISOString().split("T")[0]
        }.csv`,
        rows
      );

      toast({
        title: "Success",
        description: "CSV has been generated successfully.",
      });
    } catch (error) {
      // console.error('Error generating CSV:', error);
      toast({
        title: "Error",
        description: "Failed to generate CSV. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Only admins should access this page
  if (currentUser?.role !== "admin") {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const testerData = prepareUserBugData(users, bugs, "tester");
  const developerData = prepareUserBugData(users, bugs, "developer");

  return (
    <div className="container py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <Tabs defaultValue="testers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="testers">Testers</TabsTrigger>
          <TabsTrigger value="developers">Developers</TabsTrigger>
        </TabsList>

        <TabsContent value="testers" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tester Reports</CardTitle>
                <CardDescription>
                  Overview of bug reporting activity for all testers.
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => exportToPdf(testerData, "Tester Reports")}
                >
                  <FileText className="h-4 w-4" /> Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => exportToCsvFile(testerData, "Tester Reports")}
                >
                  <FileIcon className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableCaption>
                    A list of all testers and their bug reporting activity.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pending Bugs</TableHead>
                      <TableHead>Fixed Bugs</TableHead>
                      <TableHead>Total Bugs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testerData.length > 0 ? (
                      testerData.map((tester) => (
                        <TableRow key={tester.id}>
                          <TableCell className="font-medium">
                            {tester.name}
                          </TableCell>
                          <TableCell>{tester.email}</TableCell>
                          <TableCell>{tester.pendingBugs}</TableCell>
                          <TableCell>{tester.fixedBugs}</TableCell>
                          <TableCell>{tester.totalBugs}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No testers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="developers" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Developer Reports</CardTitle>
                <CardDescription>
                  Overview of bug reporting activity for all developers.
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() =>
                    exportToPdf(developerData, "Developer Reports")
                  }
                >
                  <FileText className="h-4 w-4" /> Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() =>
                    exportToCsvFile(developerData, "Developer Reports")
                  }
                >
                  <FileIcon className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableCaption>
                    A list of all developers and their bug reporting activity.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Pending Bugs</TableHead>
                      <TableHead>Fixed Bugs</TableHead>
                      <TableHead>Total Bugs</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {developerData.length > 0 ? (
                      developerData.map((developer) => (
                        <TableRow key={developer.id}>
                          <TableCell className="font-medium">
                            {developer.name}
                          </TableCell>
                          <TableCell>{developer.email}</TableCell>
                          <TableCell>{developer.pendingBugs}</TableCell>
                          <TableCell>{developer.fixedBugs}</TableCell>
                          <TableCell>{developer.totalBugs}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No developers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
