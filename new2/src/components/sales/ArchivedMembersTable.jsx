
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArchiveRestore } from "lucide-react";

const ArchivedMembersTable = ({ members, onRestore }) => {
  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead>Member Name</TableHead>
            <TableHead>Archived Date</TableHead>
            <TableHead>Archived By</TableHead>
            <TableHead>Employment End Date</TableHead>
            <TableHead>Archive Reason</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No archived members found.
              </TableCell>
            </TableRow>
          ) : members.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell>
                {m.archived_at ? format(new Date(m.archived_at), 'MMM d, yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">Admin</Badge>
              </TableCell>
              <TableCell>
                {m.employment_end_date ? format(new Date(m.employment_end_date), 'MMM d, yyyy') : 'N/A'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-muted-foreground" title={m.archive_reason}>
                {m.archive_reason || '-'}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onRestore(m.id)}>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  Restore
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ArchivedMembersTable;
