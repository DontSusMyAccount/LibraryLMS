"use client";

import type { UserRole } from "@libsys/shared";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { MemberListItem } from "../members.types";
import { MemberStatusBadge } from "./member-status-badge";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "แอดมิน",
  librarian: "บรรณารักษ์",
  faculty: "อาจารย์",
  staff: "เจ้าหน้าที่",
  student: "นักศึกษา",
};

interface MembersTableProps {
  members: MemberListItem[];
  onEdit: (member: MemberListItem) => void;
}

function MembersTable({ members, onEdit }: MembersTableProps) {
  return (
    <Table data-slot="members-table">
      <TableHeader>
        <TableRow>
          <TableHead>ชื่อ</TableHead>
          <TableHead>อีเมล</TableHead>
          <TableHead>บทบาท</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>รหัสนักศึกษา/พนักงาน</TableHead>
          <TableHead>เบอร์โทร</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow
            key={member.id}
            tabIndex={0}
            onClick={() => onEdit(member)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onEdit(member);
              }
            }}
            aria-label={`แก้ไขสมาชิก ${member.fullName}`}
            className="cursor-pointer"
          >
            <TableCell>
              <p className="font-medium text-foreground">{member.fullName}</p>
            </TableCell>
            <TableCell className="text-muted-foreground">{member.email}</TableCell>
            <TableCell className="text-muted-foreground">{ROLE_LABELS[member.role]}</TableCell>
            <TableCell>
              <MemberStatusBadge status={member.status} />
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {member.studentOrStaffId ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {member.phone ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { MembersTable };

export type { MembersTableProps };
