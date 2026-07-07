import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HelpPermissionRow } from "@/lib/help/types";
import { helpInnerCard } from "./HelpPageShell";

interface HelpPermissionTableProps {
  title?: string;
  rows: HelpPermissionRow[];
}

export function HelpPermissionTable({ title, rows }: HelpPermissionTableProps) {
  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
      <div className={`${helpInnerCard} overflow-hidden`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Access</TableHead>
              <TableHead className="hidden sm:table-cell font-semibold">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/20">
                <TableCell className="font-medium">{row.role}</TableCell>
                <TableCell>{row.access}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {row.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface HelpDataTableProps {
  title?: string;
  headers: string[];
  rows: string[][];
}

export function HelpDataTable({ title, headers, rows }: HelpDataTableProps) {
  return (
    <div className="space-y-2">
      {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
      <div className={`${helpInnerCard} overflow-x-auto`}>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {headers.map((h) => (
                <TableHead key={h} className="font-semibold">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/20">
                {row.map((cell, j) => (
                  <TableCell key={j}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
