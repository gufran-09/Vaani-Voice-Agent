'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];
type Membership = Database['public']['Tables']['memberships']['Row'];

interface AppContextValue {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentProperty: Property | null;
  properties: Property[];
  userRole: string | null;
  loading: boolean;
  switchOrg: (orgId: string) => void;
  switchProperty: (propertyId: string) => void;
  refresh: () => void;
}

const AppContext = createContext<AppContextValue>({
  organizations: [],
  currentOrg: null,
  currentProperty: null,
  properties: [],
  userRole: null,
  loading: true,
  switchOrg: () => {},
  switchProperty: () => {},
  refresh: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setProperties([]);
      setCurrentProperty(null);
      setUserRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      const { data: memberships } = await supabase
        .from('memberships')
        .select('organization_id, role')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

      const orgIds = memberships.map((m) => m.organization_id);
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (!orgs || orgs.length === 0) {
        setLoading(false);
        return;
      }

      setOrganizations(orgs);

      const savedOrgId = typeof window !== 'undefined' ? localStorage.getItem('vaani_current_org') : null;
      const initialOrg = orgs.find((o) => o.id === savedOrgId) ?? orgs[0];
      setCurrentOrg(initialOrg);

      const membership = memberships.find((m) => m.organization_id === initialOrg.id);
      setUserRole(membership?.role ?? null);

      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', initialOrg.id)
        .order('created_at', { ascending: true });

      if (props && props.length > 0) {
        setProperties(props);
        const savedPropId = typeof window !== 'undefined' ? localStorage.getItem('vaani_current_property') : null;
        const initialProp = props.find((p) => p.id === savedPropId) ?? props[0];
        setCurrentProperty(initialProp);
      } else {
        setProperties([]);
        setCurrentProperty(null);
      }

      setLoading(false);
    })();
  }, [user, refreshKey]);

  const switchOrg = useCallback((orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;
    setCurrentOrg(org);
    if (typeof window !== 'undefined') localStorage.setItem('vaani_current_org', orgId);

    supabase
      .from('memberships')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user?.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserRole(data?.role ?? null);
      });

    supabase
      .from('properties')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProperties(data);
          setCurrentProperty(data[0]);
          if (typeof window !== 'undefined') localStorage.setItem('vaani_current_property', data[0].id);
        } else {
          setProperties([]);
          setCurrentProperty(null);
        }
      });
  }, [organizations, user]);

  const switchProperty = useCallback((propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return;
    setCurrentProperty(prop);
    if (typeof window !== 'undefined') localStorage.setItem('vaani_current_property', propertyId);
  }, [properties]);

  return (
    <AppContext.Provider
      value={{
        organizations,
        currentOrg,
        currentProperty,
        properties,
        userRole,
        loading,
        switchOrg,
        switchProperty,
        refresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
