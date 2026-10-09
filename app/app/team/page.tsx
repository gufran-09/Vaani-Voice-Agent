'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table';
import { Users, UserPlus, Mail, Shield, Building2, AlertCircle, Loader2 } from 'lucide-react';

type Membership = Database['public']['Tables']['memberships']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type PropertyAssignment = Database['public']['Tables']['property_assignments']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];
type UserRole = Database['public']['Tables']['memberships']['Row']['role'];

interface TeamMember {
  membership: Membership;
  profile: Profile | null;
  assignedProperties: Property[];
}

const ROLE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  owner: 'default',
  org_admin: 'default',
  property_manager: 'secondary',
  front_desk: 'secondary',
  restaurant_manager: 'secondary',
  kitchen_staff: 'outline',
  analyst: 'outline',
};

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  org_admin: 'Org Admin',
  property_manager: 'Property Manager',
  front_desk: 'Front Desk',
  restaurant_manager: 'Restaurant Manager',
  kitchen_staff: 'Kitchen Staff',
  analyst: 'Analyst',
};

const ROLE_OPTIONS: UserRole[] = [
  'owner', 'org_admin', 'property_manager', 'front_desk', 'restaurant_manager', 'kitchen_staff', 'analyst',
];

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }
  return email.slice(0, 2).toUpperCase();
}

export default function TeamPage() {
  const { currentOrg, loading: orgLoading } = useApp();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('property_manager');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [membershipsRes, assignmentsRes, propertiesRes] = await Promise.all([
        supabase.from('memberships').select('*').eq('organization_id', currentOrg.id),
        supabase.from('property_assignments').select('*, property_id'),
        supabase.from('properties').select('*').eq('organization_id', currentOrg.id),
      ]);

      if (membershipsRes.error) throw membershipsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;

      const memberships = membershipsRes.data ?? [];
      const assignments = (assignmentsRes.data ?? []) as (PropertyAssignment & { property_id: string })[];
      const properties = (propertiesRes.data ?? []) as Property[];

      // Fetch profiles for all member user_ids
      const userIds = memberships.map((m) => m.user_id);
      let profilesMap: Record<string, Profile> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        if (profilesError) throw profilesError;
        profilesMap = (profiles ?? []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Profile>);
      }

      const propertyMap = properties.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, Property>);

      const teamMembers: TeamMember[] = memberships.map((membership) => {
        const memberAssignments = assignments.filter((a) => a.user_id === membership.user_id);
        const assignedProperties = memberAssignments
          .map((a) => propertyMap[a.property_id])
          .filter((p): p is Property => Boolean(p));
        return {
          membership,
          profile: profilesMap[membership.user_id] ?? null,
          assignedProperties,
        };
      });

      setMembers(teamMembers);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team members';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInviteSubmit = () => {
    if (!inviteEmail.trim()) return;
    setInviteMessage(`An invitation to join ${currentOrg?.name} as ${ROLE_LABELS[inviteRole]} would be sent to ${inviteEmail}.`);
  };

  const resetInvite = () => {
    setInviteEmail('');
    setInviteRole('property_manager');
    setInviteMessage(null);
  };

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Users className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No organization selected</h2>
        <p className="text-muted-foreground">Select an organization to view your team.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-display font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchTeam} variant="outline">Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Team &amp; Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage members and their roles in {currentOrg.name}
          </p>
        </div>
        <Button onClick={() => { resetInvite(); setInviteOpen(true); }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Members</CardTitle>
          <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''} in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned Properties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const email = member.profile?.email ?? 'Unknown email';
                  const name = member.profile?.full_name ?? email;
                  return (
                    <TableRow key={member.membership.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={member.profile?.avatar_url ?? undefined} alt={name} />
                            <AvatarFallback className="text-xs">
                              {initials(member.profile?.full_name ?? null, email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{name}</div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANT[member.membership.role]} className="capitalize">
                          <Shield className="w-3 h-3 mr-1" />
                          {ROLE_LABELS[member.membership.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {member.assignedProperties.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No properties assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {member.assignedProperties.map((p) => (
                              <Badge key={p.id} variant="outline" className="text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInvite(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              Send an invitation to join {currentOrg.name}.
            </DialogDescription>
          </DialogHeader>
          {inviteMessage ? (
            <div className="rounded-lg border bg-accent/10 p-4 text-sm text-accent-foreground">
              {inviteMessage}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            {inviteMessage ? (
              <Button onClick={() => { setInviteOpen(false); resetInvite(); }}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInviteSubmit} disabled={!inviteEmail.trim()}>
                  Send Invitation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
